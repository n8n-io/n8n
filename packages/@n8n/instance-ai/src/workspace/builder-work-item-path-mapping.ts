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
import { normalize as normalizePath } from 'node:path/posix';

const BUILDER_WORK_ITEMS_DIR = 'builder-work-items';

function trimTrailingSlash(path: string): string {
	return path.length > 1 ? path.replace(/\/+$/g, '') : path;
}

function normalized(path: string): string {
	return trimTrailingSlash(normalizePath(path));
}

function escapeRegex(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function remapSingleBuilderPath(value: string, root: string, currentWorkItemRoot: string): string {
	const normalizedRoot = normalized(root);
	const normalizedCurrentRoot = normalized(currentWorkItemRoot);
	const absolutePrefix = `${normalizedRoot}/${BUILDER_WORK_ITEMS_DIR}/`;
	const relativePrefix = `${BUILDER_WORK_ITEMS_DIR}/`;
	const relativeCurrentRoot = normalizedCurrentRoot.startsWith(`${normalizedRoot}/`)
		? normalizedCurrentRoot.slice(normalizedRoot.length + 1)
		: normalizedCurrentRoot;

	if (value.startsWith(absolutePrefix)) {
		const rest = value.slice(absolutePrefix.length);
		const slashIndex = rest.indexOf('/');
		return slashIndex < 0
			? normalizedCurrentRoot
			: `${normalizedCurrentRoot}/${rest.slice(slashIndex + 1)}`;
	}

	if (value.startsWith(relativePrefix)) {
		const rest = value.slice(relativePrefix.length);
		const slashIndex = rest.indexOf('/');
		return slashIndex < 0
			? relativeCurrentRoot
			: `${relativeCurrentRoot}/${rest.slice(slashIndex + 1)}`;
	}

	return value;
}

export function remapBuilderWorkItemPathReferences(
	value: string,
	root: string,
	currentWorkItemRoot: string,
): string {
	const direct = remapSingleBuilderPath(value, root, currentWorkItemRoot);
	if (direct !== value) return direct;

	const normalizedRoot = normalized(root);
	const absolutePattern = new RegExp(
		`${escapeRegex(normalizedRoot)}/${BUILDER_WORK_ITEMS_DIR}/[^\\s'"]+`,
		'g',
	);
	const relativePattern = new RegExp(
		`(^|[^A-Za-z0-9_/-])(${BUILDER_WORK_ITEMS_DIR}/[^\\s'"]+)`,
		'g',
	);

	return value
		.replace(absolutePattern, (path) =>
			remapSingleBuilderPath(path, normalizedRoot, currentWorkItemRoot),
		)
		.replace(relativePattern, (_match, prefix: string, path: string) => {
			return `${prefix}${remapSingleBuilderPath(path, normalizedRoot, currentWorkItemRoot)}`;
		});
}

class BuilderWorkItemMappedFilesystem implements WorkspaceFilesystem {
	constructor(
		private readonly filesystem: WorkspaceFilesystem,
		private readonly root: string,
		private readonly currentWorkItemRoot: string,
	) {}

	get id() {
		return `${this.filesystem.id}:builder-work-item-mapped`;
	}

	get name() {
		return `${this.filesystem.name} (builder work item mapped)`;
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
		return this.filesystem.basePath;
	}

	getInstructions(): string {
		return this.filesystem.getInstructions?.() ?? '';
	}

	async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
		return await this.filesystem.readFile(this.mapPath(path), options);
	}

	async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
		await this.filesystem.writeFile(this.mapPath(path), content, options);
	}

	async appendFile(path: string, content: FileContent): Promise<void> {
		await this.filesystem.appendFile(this.mapPath(path), content);
	}

	async deleteFile(path: string, options?: RemoveOptions): Promise<void> {
		await this.filesystem.deleteFile(this.mapPath(path), options);
	}

	async copyFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await this.filesystem.copyFile(this.mapPath(src), this.mapPath(dest), options);
	}

	async moveFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await this.filesystem.moveFile(this.mapPath(src), this.mapPath(dest), options);
	}

	async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
		await this.filesystem.mkdir(this.mapPath(path), options);
	}

	async rmdir(path: string, options?: RemoveOptions): Promise<void> {
		await this.filesystem.rmdir(this.mapPath(path), options);
	}

	async readdir(path: string, options?: ListOptions): Promise<FileEntry[]> {
		return await this.filesystem.readdir(this.mapPath(path), options);
	}

	async exists(path: string): Promise<boolean> {
		return await this.filesystem.exists(this.mapPath(path));
	}

	async stat(path: string): Promise<FileStat> {
		return await this.filesystem.stat(this.mapPath(path));
	}

	private mapPath(path: string): string {
		return remapBuilderWorkItemPathReferences(path, this.root, this.currentWorkItemRoot);
	}
}

class BuilderWorkItemMappedSandbox implements WorkspaceSandbox {
	readonly executeCommand?: NonNullable<WorkspaceSandbox['executeCommand']>;
	readonly processes?: WorkspaceSandbox['processes'];

	constructor(
		private readonly sandbox: WorkspaceSandbox,
		private readonly root: string,
		private readonly currentWorkItemRoot: string,
	) {
		if (sandbox.executeCommand) {
			const executeCommand = sandbox.executeCommand.bind(sandbox);
			this.executeCommand = async (command, args = [], options = {}) => {
				return await executeCommand(
					this.map(command),
					args.map((arg) => this.map(arg)),
					{
						...options,
						cwd: options.cwd ? this.map(options.cwd) : options.cwd,
					},
				);
			};
		}

		if (sandbox.processes) {
			const processes = sandbox.processes;
			this.processes = {
				spawn: async (command, options = {}) => {
					return await processes.spawn(this.map(command), {
						...options,
						cwd: options.cwd ? this.map(options.cwd) : options.cwd,
					});
				},
				list: async () => await processes.list(),
				get: async (pid) => await processes.get(pid),
				kill: async (pid) => await processes.kill(pid),
			};
		}
	}

	get id() {
		return `${this.sandbox.id}:builder-work-item-mapped`;
	}

	get name() {
		return `${this.sandbox.name} (builder work item mapped)`;
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

	getDefaultCommandEnv(): NodeJS.ProcessEnv {
		return this.sandbox.getDefaultCommandEnv?.() ?? {};
	}

	getInstructions(): string {
		return this.sandbox.getInstructions?.() ?? '';
	}

	private map(value: string): string {
		return remapBuilderWorkItemPathReferences(value, this.root, this.currentWorkItemRoot);
	}
}

export function createBuilderWorkItemPathMappedWorkspace(
	workspace: Workspace,
	root: string,
	currentWorkItemRoot: string,
): Workspace {
	return new Workspace({
		id: `${workspace.id}:builder-work-item-mapped`,
		name: `${workspace.name} (builder work item mapped)`,
		filesystem: workspace.filesystem
			? new BuilderWorkItemMappedFilesystem(workspace.filesystem, root, currentWorkItemRoot)
			: undefined,
		sandbox: workspace.sandbox
			? new BuilderWorkItemMappedSandbox(workspace.sandbox, root, currentWorkItemRoot)
			: undefined,
	});
}
