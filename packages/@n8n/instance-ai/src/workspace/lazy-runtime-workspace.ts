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

	constructor(private readonly ensureWorkspace: RuntimeWorkspaceResolver) {}

	get current(): Workspace | undefined {
		return this.resolvedWorkspace;
	}

	async getWorkspace(): Promise<Workspace> {
		this.workspacePromise ??= this.ensureWorkspace()
			.then((workspace) => {
				this.resolvedWorkspace = workspace;
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
}

class LazyRuntimeFilesystem extends BaseFilesystem {
	readonly id = 'instance-ai-runtime-filesystem';
	readonly name = 'InstanceAiRuntimeFilesystem';
	readonly provider = 'lazy';
	status: ProviderStatus = 'pending';

	constructor(private readonly resolver: LazyRuntimeWorkspaceResolver) {
		super();
	}

	get readOnly(): boolean | undefined {
		return this.resolver.current?.filesystem?.readOnly;
	}

	get basePath(): string | undefined {
		return this.resolver.current?.filesystem?.basePath;
	}

	override async init(): Promise<void> {
		await this.resolver.getFilesystem();
	}

	getInstructions(): string {
		return [
			'Workspace file tools are available and create the runtime workspace on first use.',
			'Use relative workspace paths unless a loaded skill explicitly provides an absolute workspace path.',
		].join(' ');
	}

	async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
		return await (await this.resolver.getFilesystem()).readFile(path, options);
	}

	async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
		await (await this.resolver.getFilesystem()).writeFile(path, content, options);
	}

	async appendFile(path: string, content: FileContent): Promise<void> {
		await (await this.resolver.getFilesystem()).appendFile(path, content);
	}

	async deleteFile(path: string, options?: RemoveOptions): Promise<void> {
		await (await this.resolver.getFilesystem()).deleteFile(path, options);
	}

	async copyFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await (await this.resolver.getFilesystem()).copyFile(src, dest, options);
	}

	async moveFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await (await this.resolver.getFilesystem()).moveFile(src, dest, options);
	}

	async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
		await (await this.resolver.getFilesystem()).mkdir(path, options);
	}

	async rmdir(path: string, options?: RemoveOptions): Promise<void> {
		await (await this.resolver.getFilesystem()).rmdir(path, options);
	}

	async readdir(path: string, options?: ListOptions): Promise<FileEntry[]> {
		return await (await this.resolver.getFilesystem()).readdir(path, options);
	}

	async exists(path: string): Promise<boolean> {
		return await (await this.resolver.getFilesystem()).exists(path);
	}

	async stat(path: string): Promise<FileStat> {
		return await (await this.resolver.getFilesystem()).stat(path);
	}
}

class LazyRuntimeSandbox extends BaseSandbox {
	readonly id = 'instance-ai-runtime-sandbox';
	readonly name = 'InstanceAiRuntimeSandbox';
	readonly provider = 'lazy';
	status: ProviderStatus = 'pending';

	constructor(private readonly resolver: LazyRuntimeWorkspaceResolver) {
		super();
	}

	override async start(): Promise<void> {
		await this.resolver.getSandbox();
	}

	override async stop(): Promise<void> {}

	override async destroy(): Promise<void> {}

	getDefaultCommandEnv(): NodeJS.ProcessEnv {
		return this.resolver.current?.sandbox?.getDefaultCommandEnv?.() ?? {};
	}

	override async executeCommand(
		command: string,
		args: string[] = [],
		options?: ExecuteCommandOptions,
	): Promise<CommandResult> {
		const sandbox = await this.resolver.getSandbox();
		if (!sandbox.executeCommand) {
			throw new Error('Instance AI runtime sandbox does not support command execution.');
		}

		const defaultEnv = sandbox.getDefaultCommandEnv?.();
		return await sandbox.executeCommand(command, args, {
			...options,
			...(defaultEnv ? { env: { ...defaultEnv, ...options?.env } } : {}),
		});
	}

	override getInstructions(): string {
		return 'Workspace command tools are available and create the runtime sandbox on first use.';
	}
}
