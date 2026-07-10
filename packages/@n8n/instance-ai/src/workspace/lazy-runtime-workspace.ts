import {
	BaseFilesystem,
	BaseSandbox,
	Workspace,
	type CommandResult,
	type CopyOptions,
	type ExecuteCommandOptions,
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

export type RuntimeWorkspaceResolver = () => Promise<Workspace | undefined>;

/** Workspace tools exposed to Instance AI agents — read/write/replace/execute only. */
export const INSTANCE_AI_WORKSPACE_TOOL_ALLOWLIST = new Set([
	'workspace_read_file',
	'workspace_write_file',
	'workspace_str_replace_file',
	'workspace_batch_str_replace_file',
	'workspace_execute_command',
]);

export interface LazyRuntimeWorkspaceOptions {
	ensureWorkspace: RuntimeWorkspaceResolver;
	id?: string;
	name?: string;
	/**
	 * Stable sandbox / filesystem instructions surfaced to the agent's system
	 * prompt. When set, each is returned verbatim regardless of lazy-resolution
	 * state so the cached prompt prefix stays byte-stable across agent
	 * rebuilds/resumes (see {@link LazyRuntimeSandbox.getInstructions} and
	 * {@link LazyRuntimeFilesystem.getInstructions}). Omit only when prompt
	 * caching is irrelevant.
	 */
	sandboxInstructions?: string;
	filesystemInstructions?: string;
}

type WorkspaceResolvedListener = (workspace: Workspace) => void;
type WorkspaceDestroyedListener = () => void;

export function createLazyRuntimeWorkspace({
	ensureWorkspace,
	id = 'instance-ai-runtime-workspace',
	name = 'Instance AI runtime workspace',
	sandboxInstructions,
	filesystemInstructions,
}: LazyRuntimeWorkspaceOptions): Workspace {
	const resolver = new LazyRuntimeWorkspaceResolver(ensureWorkspace);

	const workspace = new Workspace({
		id,
		name,
		filesystem: new LazyRuntimeFilesystem(resolver, filesystemInstructions),
		sandbox: new LazyRuntimeSandbox(resolver, sandboxInstructions),
	});

	const baseGetTools = workspace.getTools.bind(workspace);
	workspace.getTools = () =>
		baseGetTools().filter((tool) => INSTANCE_AI_WORKSPACE_TOOL_ALLOWLIST.has(tool.name));

	return workspace;
}

class LazyRuntimeWorkspaceResolver {
	private workspacePromise: Promise<Workspace | undefined> | undefined;
	private resolvedWorkspace: Workspace | undefined;
	private workspaceDestroyPromise: Promise<void> | undefined;
	private readonly resolvedListeners = new Set<WorkspaceResolvedListener>();
	private readonly destroyedListeners = new Set<WorkspaceDestroyedListener>();

	constructor(private readonly ensureWorkspace: RuntimeWorkspaceResolver) {}

	get current(): Workspace | undefined {
		return this.resolvedWorkspace;
	}

	onResolved(listener: WorkspaceResolvedListener): void {
		this.resolvedListeners.add(listener);
		if (this.resolvedWorkspace) listener(this.resolvedWorkspace);
	}

	onDestroyed(listener: WorkspaceDestroyedListener): void {
		this.destroyedListeners.add(listener);
	}

	async getWorkspace(): Promise<Workspace> {
		this.workspacePromise ??= this.ensureWorkspace()
			.then((workspace) => {
				this.setResolvedWorkspace(workspace);
				return workspace;
			})
			.catch((error: unknown) => {
				this.workspacePromise = undefined;
				throw error;
			});

		const workspace = await this.workspacePromise;
		if (!workspace) {
			this.workspacePromise = undefined;
			throw new Error('Instance AI runtime workspace is unavailable.');
		}

		return workspace;
	}

	async destroyResolvedWorkspace(): Promise<void> {
		if (this.workspaceDestroyPromise) return await this.workspaceDestroyPromise;

		const workspace =
			this.resolvedWorkspace ?? (await this.workspacePromise?.catch(() => undefined));
		if (!workspace) {
			this.workspacePromise = undefined;
			return;
		}

		this.workspaceDestroyPromise = workspace.destroy().then(() => {
			this.workspacePromise = undefined;
			this.resolvedWorkspace = undefined;
			this.notifyDestroyed();
		});
		try {
			await this.workspaceDestroyPromise;
		} finally {
			this.workspaceDestroyPromise = undefined;
		}
	}

	async getFilesystem(): Promise<WorkspaceFilesystem> {
		const filesystem = (await this.getWorkspace()).filesystem;
		if (!filesystem) {
			throw new Error('Instance AI runtime workspace has no filesystem.');
		}

		return filesystem;
	}

	async getSandbox(): Promise<WorkspaceSandbox> {
		const sandbox = (await this.getWorkspace()).sandbox;
		if (!sandbox) {
			throw new Error('Instance AI runtime workspace has no sandbox.');
		}

		return sandbox;
	}

	private setResolvedWorkspace(workspace: Workspace | undefined): void {
		this.resolvedWorkspace = workspace;
		if (!workspace) return;

		for (const listener of this.resolvedListeners) {
			listener(workspace);
		}
	}

	private notifyDestroyed(): void {
		for (const listener of this.destroyedListeners) {
			listener();
		}
	}
}

class LazyRuntimeFilesystem extends BaseFilesystem {
	readonly id = 'instance-ai-runtime-filesystem';
	readonly name = 'InstanceAiRuntimeFilesystem';
	readonly provider = 'lazy';
	status: ProviderStatus = 'pending';

	constructor(
		private readonly resolver: LazyRuntimeWorkspaceResolver,
		private readonly staticInstructions?: string,
	) {
		super();
		this.resolver.onResolved((workspace) => {
			this.status = workspace.filesystem?.status ?? this.status;
		});
		this.resolver.onDestroyed(() => {
			this.status = 'destroyed';
		});
	}

	get readOnly(): boolean | undefined {
		return this.resolver.current?.filesystem?.readOnly;
	}

	get basePath(): string | undefined {
		return this.resolver.current?.filesystem?.basePath;
	}

	override async init(): Promise<void> {
		const filesystem = await this.getFilesystem();
		await (filesystem._init?.() ?? filesystem.init?.());
		this.syncStatus(filesystem);
	}

	override async destroy(): Promise<void> {
		await this.resolver.destroyResolvedWorkspace();
	}

	getInstructions(): string {
		// Prefer the caller-provided stable text so the agent's cached prompt
		// prefix stays byte-stable across rebuilds/resumes. Branching on the
		// resolved (scoped) filesystem would otherwise flip the prompt text once
		// the workspace resolves and bust prompt caching (see LazyRuntimeSandbox).
		if (this.staticInstructions) return this.staticInstructions;

		const instructions = this.resolver.current?.filesystem?.getInstructions?.();
		if (instructions) return instructions;

		return [
			'Workspace file tools are available and create the runtime workspace on first use.',
			'Paths are relative to the workspace root unless you pass an absolute path under that root.',
		].join(' ');
	}

	async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
		return await (await this.getFilesystem()).readFile(path, options);
	}

	async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
		await (await this.getFilesystem()).writeFile(path, content, options);
	}

	async appendFile(path: string, content: FileContent): Promise<void> {
		await (await this.getFilesystem()).appendFile(path, content);
	}

	async deleteFile(path: string, options?: RemoveOptions): Promise<void> {
		await (await this.getFilesystem()).deleteFile(path, options);
	}

	async copyFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await (await this.getFilesystem()).copyFile(src, dest, options);
	}

	async moveFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await (await this.getFilesystem()).moveFile(src, dest, options);
	}

	async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
		await (await this.getFilesystem()).mkdir(path, options);
	}

	async rmdir(path: string, options?: RemoveOptions): Promise<void> {
		await (await this.getFilesystem()).rmdir(path, options);
	}

	async readdir(path: string, options?: ListOptions): Promise<FileEntry[]> {
		return await (await this.getFilesystem()).readdir(path, options);
	}

	async exists(path: string): Promise<boolean> {
		return await (await this.getFilesystem()).exists(path);
	}

	async stat(path: string): Promise<FileStat> {
		return await (await this.getFilesystem()).stat(path);
	}

	private async getFilesystem(): Promise<WorkspaceFilesystem> {
		const filesystem = await this.resolver.getFilesystem();
		this.syncStatus(filesystem);
		return filesystem;
	}

	private syncStatus(filesystem: WorkspaceFilesystem): void {
		this.status = filesystem.status;
	}
}

class LazyRuntimeSandbox extends BaseSandbox {
	readonly id = 'instance-ai-runtime-sandbox';
	readonly name = 'InstanceAiRuntimeSandbox';
	readonly provider = 'lazy';
	status: ProviderStatus = 'pending';

	constructor(
		private readonly resolver: LazyRuntimeWorkspaceResolver,
		private readonly staticInstructions?: string,
	) {
		super();
		this.resolver.onResolved((workspace) => {
			this.status = workspace.sandbox?.status ?? this.status;
		});
		this.resolver.onDestroyed(() => {
			this.status = 'destroyed';
		});
	}

	override async start(): Promise<void> {
		const sandbox = await this.getSandbox();
		await (sandbox._start?.() ?? sandbox.start?.());
		this.syncStatus(sandbox);
	}

	override async stop(): Promise<void> {
		const sandbox = this.resolver.current?.sandbox;
		if (!sandbox) return;
		await (sandbox._stop?.() ?? sandbox.stop?.());
		this.syncStatus(sandbox);
	}

	override async destroy(): Promise<void> {
		await this.resolver.destroyResolvedWorkspace();
	}

	getDefaultCommandEnv(): NodeJS.ProcessEnv {
		return this.resolver.current?.sandbox?.getDefaultCommandEnv?.() ?? {};
	}

	override async executeCommand(
		command: string,
		args: string[] = [],
		options?: ExecuteCommandOptions,
	): Promise<CommandResult> {
		const sandbox = await this.getSandbox();
		if (!sandbox.executeCommand) {
			throw new Error('Instance AI runtime sandbox does not support command execution.');
		}

		const defaultEnv = sandbox.getDefaultCommandEnv?.();
		try {
			return await sandbox.executeCommand(command, args, {
				...options,
				...(defaultEnv ? { env: { ...defaultEnv, ...options?.env } } : {}),
			});
		} finally {
			this.syncStatus(sandbox);
		}
	}

	override getInstructions(): string {
		// Prefer the caller-provided stable text: it is returned regardless of
		// resolution state so the agent's cached prompt prefix stays byte-stable
		// across rebuilds/resumes. Branching on the live sandbox (which is only
		// resolved once a workspace tool runs in this rebuilt instance) would
		// otherwise flip the prompt text between resumes and bust prompt caching.
		if (this.staticInstructions) return this.staticInstructions;

		const instructions = this.resolver.current?.sandbox?.getInstructions?.();
		if (instructions) return instructions;

		return 'Workspace command tools are available and create the runtime sandbox on first use.';
	}

	private async getSandbox(): Promise<WorkspaceSandbox> {
		const sandbox = await this.resolver.getSandbox();
		this.syncStatus(sandbox);
		return sandbox;
	}

	private syncStatus(sandbox: WorkspaceSandbox): void {
		this.status = sandbox.status;
	}
}
