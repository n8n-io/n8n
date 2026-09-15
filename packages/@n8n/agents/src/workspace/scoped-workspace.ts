import { join as posixJoin, normalize as posixNormalize } from 'node:path/posix';

import type {
	AbortableOptions,
	AppendOptions,
	CopyOptions,
	FileContent,
	FileEntry,
	FileStat,
	ListOptions,
	MkdirOptions,
	ProviderStatus,
	ReadOptions,
	RemoveOptions,
	WorkspaceFilesystem,
	WorkspaceSandbox,
	WriteOptions,
} from './types';
import { Workspace } from './workspace';
import { raceWithAbort, throwIfAborted } from '../sdk/abort';

function isInsideRoot(path: string, root: string): boolean {
	const boundary = root.endsWith('/') ? root : `${root}/`;
	return path === root || path.startsWith(boundary);
}

function resolvePath(root: string, path: string): string {
	const normalizedRoot = posixNormalize(root);
	const normalizedPath = path.startsWith('/')
		? posixNormalize(path)
		: posixNormalize(posixJoin(normalizedRoot, path));

	if (!isInsideRoot(normalizedPath, normalizedRoot)) {
		throw new Error(
			`Path "${path}" is outside the workspace root "${normalizedRoot}". ` +
				'Use a path relative to the workspace root, e.g. "tmp/output.txt".',
		);
	}

	return normalizedPath;
}

export interface ScopedWorkspaceOptions {
	/** Create the scope root (`mkdir -p`) once before the first filesystem or command use. */
	ensureRootExists?: boolean;
}

type EnsureRoot = (abortSignal?: AbortSignal) => Promise<void>;

class ScopedFilesystem implements WorkspaceFilesystem {
	constructor(
		private readonly filesystem: WorkspaceFilesystem,
		private readonly root: string,
		private readonly ensureRoot?: EnsureRoot,
	) {}

	get id() {
		return `${this.filesystem.id}:scoped`;
	}

	get name() {
		return `${this.filesystem.name} (scoped)`;
	}

	get provider() {
		return this.filesystem.provider;
	}

	get status() {
		return this.filesystem.status;
	}

	set status(status: ProviderStatus) {
		this.filesystem.status = status;
	}

	get readOnly() {
		return this.filesystem.readOnly;
	}

	get basePath() {
		return this.root;
	}

	getInstructions(): string {
		const base = this.filesystem.getInstructions?.() ?? '';
		const scope =
			`Filesystem access is scoped to ${this.root}. ` +
			'Paths are relative to the workspace root unless you pass an absolute path under that root. ' +
			`Use ${this.root}/tmp for scratch files.`;
		return [base, scope].filter(Boolean).join('\n');
	}

	/**
	 * Resolve paths inside the scope root, then make sure the root exists.
	 * Validation runs first so escaping paths reject without side effects
	 * (no sandbox boot, no directory creation).
	 */
	private async preparePaths(paths: string[], options?: AbortableOptions): Promise<string[]> {
		const resolved = paths.map((path) => resolvePath(this.root, path));
		await this.ensureRoot?.(options?.abortSignal);
		return resolved;
	}

	private async preparePath(path: string, options?: AbortableOptions): Promise<string> {
		const [resolved] = await this.preparePaths([path], options);
		return resolved;
	}

	async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
		return await this.filesystem.readFile(await this.preparePath(path, options), options);
	}

	async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
		await this.filesystem.writeFile(await this.preparePath(path, options), content, options);
	}

	async appendFile(path: string, content: FileContent, options?: AppendOptions): Promise<void> {
		await this.filesystem.appendFile(await this.preparePath(path, options), content, options);
	}

	async deleteFile(path: string, options?: RemoveOptions): Promise<void> {
		await this.filesystem.deleteFile(await this.preparePath(path, options), options);
	}

	async copyFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		const [resolvedSrc, resolvedDest] = await this.preparePaths([src, dest], options);
		await this.filesystem.copyFile(resolvedSrc, resolvedDest, options);
	}

	async moveFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		const [resolvedSrc, resolvedDest] = await this.preparePaths([src, dest], options);
		await this.filesystem.moveFile(resolvedSrc, resolvedDest, options);
	}

	async mkdir(path: string, options?: MkdirOptions): Promise<void> {
		await this.filesystem.mkdir(await this.preparePath(path, options), options);
	}

	async rmdir(path: string, options?: RemoveOptions): Promise<void> {
		await this.filesystem.rmdir(await this.preparePath(path, options), options);
	}

	async readdir(path: string, options?: ListOptions): Promise<FileEntry[]> {
		return await this.filesystem.readdir(await this.preparePath(path, options), options);
	}

	async exists(path: string, options?: AbortableOptions): Promise<boolean> {
		return await this.filesystem.exists(await this.preparePath(path, options), options);
	}

	async stat(path: string, options?: AbortableOptions): Promise<FileStat> {
		return await this.filesystem.stat(await this.preparePath(path, options), options);
	}
}

class ScopedSandbox implements WorkspaceSandbox {
	readonly executeCommand?: NonNullable<WorkspaceSandbox['executeCommand']>;

	constructor(
		private readonly sandbox: WorkspaceSandbox,
		private readonly root: string,
		private readonly env: NodeJS.ProcessEnv = {},
		ensureRoot?: EnsureRoot,
	) {
		if (sandbox.executeCommand) {
			const executeCommand = sandbox.executeCommand.bind(sandbox);
			this.executeCommand = async (command, args, options = {}) => {
				const cwd = options.cwd ? resolvePath(this.root, options.cwd) : this.root;
				// Commands run from the scope root by default — it must exist first.
				await ensureRoot?.(options.abortSignal);
				return await executeCommand(command, args, {
					...options,
					cwd,
					env: {
						...this.env,
						...options.env,
					},
				});
			};
		}
	}

	get id() {
		return `${this.sandbox.id}:scoped`;
	}

	get name() {
		return `${this.sandbox.name} (scoped)`;
	}

	get provider() {
		return this.sandbox.provider;
	}

	get status() {
		return this.sandbox.status;
	}

	set status(status: ProviderStatus) {
		this.sandbox.status = status;
	}

	get processes() {
		return this.sandbox.processes;
	}

	getInstructions(): string {
		const base = this.sandbox.getInstructions?.() ?? '';
		return [base, `Run commands from ${this.root}.`].filter(Boolean).join('\n');
	}
}

export function createScopedWorkspace(
	workspace: Workspace,
	root: string,
	env?: NodeJS.ProcessEnv,
	options?: ScopedWorkspaceOptions,
): Workspace {
	const filesystem = workspace.filesystem;
	let ensureRootPromise: Promise<void> | undefined;
	// Single-flight per scoped instance; a failed attempt resets so the next use retries.
	const ensureRoot: EnsureRoot | undefined =
		options?.ensureRootExists && filesystem
			? async (abortSignal) => {
					// Don't start (or boot a sandbox for) root creation on a dead operation.
					throwIfAborted(abortSignal);
					if (!ensureRootPromise) {
						const attempt = (async () => {
							try {
								await filesystem.mkdir(root, { recursive: true });
							} catch (error) {
								ensureRootPromise = undefined;
								throw error;
							}
						})();
						// Keep the attempt observed even when every waiter aborts before it settles.
						void attempt.catch(() => {});
						ensureRootPromise = attempt;
					}
					// Aborting unblocks this waiter; the shared mkdir keeps running for others.
					await raceWithAbort(ensureRootPromise, abortSignal);
				}
			: undefined;
	return new Workspace({
		id: `${workspace.id}:${root}`,
		name: `${workspace.name} (${root})`,
		filesystem: filesystem ? new ScopedFilesystem(filesystem, root, ensureRoot) : undefined,
		sandbox: workspace.sandbox
			? new ScopedSandbox(workspace.sandbox, root, env, ensureRoot)
			: undefined,
	});
}
