import {
	Workspace,
	type CopyOptions,
	type FileContent,
	type FileEntry,
	type FileStat,
	type ListOptions,
	type ProviderStatus,
	type ReadOptions,
	type RemoveOptions,
	type WorkspaceFilesystem,
	type WorkspaceSandbox,
	type WriteOptions,
} from '@n8n/agents';
import { join as posixJoin, normalize as posixNormalize } from 'node:path/posix';

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
		throw new Error(`Path escapes builder workspace root: ${path}`);
	}

	return normalizedPath;
}

class ScopedFilesystem implements WorkspaceFilesystem {
	constructor(
		private readonly filesystem: WorkspaceFilesystem,
		private readonly root: string,
	) {}

	get id() {
		return `${this.filesystem.id}:scoped`;
	}

	get name() {
		return `${this.filesystem.name} (builder scoped)`;
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
		return [base, `Filesystem access is scoped to ${this.root}.`].filter(Boolean).join('\n');
	}

	async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
		return await this.filesystem.readFile(resolvePath(this.root, path), options);
	}

	async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
		await this.filesystem.writeFile(resolvePath(this.root, path), content, options);
	}

	async appendFile(path: string, content: FileContent): Promise<void> {
		await this.filesystem.appendFile(resolvePath(this.root, path), content);
	}

	async deleteFile(path: string, options?: RemoveOptions): Promise<void> {
		await this.filesystem.deleteFile(resolvePath(this.root, path), options);
	}

	async copyFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await this.filesystem.copyFile(
			resolvePath(this.root, src),
			resolvePath(this.root, dest),
			options,
		);
	}

	async moveFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await this.filesystem.moveFile(
			resolvePath(this.root, src),
			resolvePath(this.root, dest),
			options,
		);
	}

	async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
		await this.filesystem.mkdir(resolvePath(this.root, path), options);
	}

	async rmdir(path: string, options?: RemoveOptions): Promise<void> {
		await this.filesystem.rmdir(resolvePath(this.root, path), options);
	}

	async readdir(path: string, options?: ListOptions): Promise<FileEntry[]> {
		return await this.filesystem.readdir(resolvePath(this.root, path), options);
	}

	async exists(path: string): Promise<boolean> {
		return await this.filesystem.exists(resolvePath(this.root, path));
	}

	async stat(path: string): Promise<FileStat> {
		return await this.filesystem.stat(resolvePath(this.root, path));
	}
}

class ScopedSandbox implements WorkspaceSandbox {
	readonly executeCommand?: NonNullable<WorkspaceSandbox['executeCommand']>;

	constructor(
		private readonly sandbox: WorkspaceSandbox,
		private readonly root: string,
		private readonly env: NodeJS.ProcessEnv = {},
	) {
		if (sandbox.executeCommand) {
			const executeCommand = sandbox.executeCommand.bind(sandbox);
			this.executeCommand = async (command, args, options = {}) => {
				const cwd = options.cwd ? resolvePath(this.root, options.cwd) : this.root;
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
		return `${this.sandbox.name} (builder scoped)`;
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
): Workspace {
	return new Workspace({
		id: `${workspace.id}:${root}`,
		name: `${workspace.name} (${root})`,
		filesystem: workspace.filesystem ? new ScopedFilesystem(workspace.filesystem, root) : undefined,
		sandbox: workspace.sandbox ? new ScopedSandbox(workspace.sandbox, root, env) : undefined,
	});
}
