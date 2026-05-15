import type {
	CopyOptions,
	FileContent,
	FileEntry,
	FileStat,
	FilesystemInfo,
	ListOptions,
	ProviderStatus,
	ReadOptions,
	RemoveOptions,
	WorkspaceFilesystem,
	WriteOptions,
} from '@mastra/core/workspace';

export interface FilesystemMutationBlocker {
	guidance: string;
}

export type FilesystemMutationGuard = () => FilesystemMutationBlocker | undefined;

export type FilesystemMutationGuardSetter = (guard: FilesystemMutationGuard | undefined) => void;

export function createGuardedFilesystem(filesystem: WorkspaceFilesystem): {
	filesystem: WorkspaceFilesystem;
	setMutationGuard: FilesystemMutationGuardSetter;
} {
	const guarded = new GuardedFilesystem(filesystem);
	return {
		filesystem: guarded,
		setMutationGuard: (guard) => guarded.setMutationGuard(guard),
	};
}

class GuardedFilesystem implements WorkspaceFilesystem {
	private mutationGuard: FilesystemMutationGuard | undefined;

	constructor(private readonly filesystem: WorkspaceFilesystem) {}

	get id() {
		return this.filesystem.id;
	}

	get name() {
		return this.filesystem.name;
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

	get error() {
		return this.filesystem.error;
	}

	set error(error: string | undefined) {
		this.filesystem.error = error;
	}

	get readOnly() {
		return this.filesystem.readOnly;
	}

	get basePath() {
		return this.filesystem.basePath;
	}

	get icon() {
		return this.filesystem.icon;
	}

	get displayName() {
		return this.filesystem.displayName;
	}

	get description() {
		return this.filesystem.description;
	}

	setMutationGuard(guard: FilesystemMutationGuard | undefined): void {
		this.mutationGuard = guard;
	}

	async init(): Promise<void> {
		await this.filesystem.init?.();
	}

	async destroy(): Promise<void> {
		await this.filesystem.destroy?.();
	}

	async isReady(): Promise<boolean> {
		return (await this.filesystem.isReady?.()) ?? true;
	}

	async getInfo(): Promise<FilesystemInfo> {
		const info = await this.filesystem.getInfo?.();
		if (info) return info;

		const fallback: FilesystemInfo = {
			id: this.id,
			name: this.name,
			provider: this.provider,
			status: this.status,
		};
		if (this.error !== undefined) fallback.error = this.error;
		if (this.readOnly !== undefined) fallback.readOnly = this.readOnly;
		if (this.icon !== undefined) fallback.icon = this.icon;
		return fallback;
	}

	getInstructions(
		options?: Parameters<NonNullable<WorkspaceFilesystem['getInstructions']>>[0],
	): string {
		return this.filesystem.getInstructions?.(options) ?? '';
	}

	async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
		return await this.filesystem.readFile(path, options);
	}

	async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
		this.assertCanMutate();
		await this.filesystem.writeFile(path, content, options);
	}

	async appendFile(path: string, content: FileContent): Promise<void> {
		this.assertCanMutate();
		await this.filesystem.appendFile(path, content);
	}

	async deleteFile(path: string, options?: RemoveOptions): Promise<void> {
		this.assertCanMutate();
		await this.filesystem.deleteFile(path, options);
	}

	async copyFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		this.assertCanMutate();
		await this.filesystem.copyFile(src, dest, options);
	}

	async moveFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		this.assertCanMutate();
		await this.filesystem.moveFile(src, dest, options);
	}

	async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
		this.assertCanMutate();
		await this.filesystem.mkdir(path, options);
	}

	async rmdir(path: string, options?: RemoveOptions): Promise<void> {
		this.assertCanMutate();
		await this.filesystem.rmdir(path, options);
	}

	async readdir(path: string, options?: ListOptions): Promise<FileEntry[]> {
		return await this.filesystem.readdir(path, options);
	}

	resolveAbsolutePath(path: string): string | undefined {
		return this.filesystem.resolveAbsolutePath?.(path);
	}

	async exists(path: string): Promise<boolean> {
		return await this.filesystem.exists(path);
	}

	async stat(path: string): Promise<FileStat> {
		return await this.filesystem.stat(path);
	}

	private assertCanMutate(): void {
		const blocker = this.mutationGuard?.();
		if (blocker) {
			throw new Error(blocker.guidance);
		}
	}
}
