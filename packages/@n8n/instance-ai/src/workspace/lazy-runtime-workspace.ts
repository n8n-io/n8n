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

export interface LazyRuntimeWorkspaceOptions {
	ensureWorkspace: RuntimeWorkspaceResolver;
	id?: string;
	name?: string;
}

type WorkspaceResolvedListener = (workspace: Workspace) => void;
type WorkspaceDestroyedListener = () => void;

export function createLazyRuntimeWorkspace({
	ensureWorkspace,
	id = 'instance-ai-runtime-workspace',
	name = 'Instance AI runtime workspace',
}: LazyRuntimeWorkspaceOptions): Workspace {
	const resolver = new LazyRuntimeWorkspaceResolver(ensureWorkspace);

	return new Workspace({
		id,
		name,
		filesystem: new LazyRuntimeFilesystem(resolver),
		sandbox: new LazyRuntimeSandbox(resolver),
	});
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

	constructor(private readonly resolver: LazyRuntimeWorkspaceResolver) {
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
		const instructions = this.resolver.current?.filesystem?.getInstructions?.();
		if (instructions) return instructions;

		return [
			'Workspace file tools are available and create the runtime workspace on first use.',
			'Use relative workspace paths unless a loaded skill explicitly provides an absolute workspace path.',
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

	constructor(private readonly resolver: LazyRuntimeWorkspaceResolver) {
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
