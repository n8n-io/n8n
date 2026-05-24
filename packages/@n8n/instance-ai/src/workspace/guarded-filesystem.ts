import type {
	CopyOptions,
	FileContent,
	FileEntry,
	FileStat,
	ListOptions,
	ProviderStatus,
	ReadOptions,
	RemoveOptions,
	WorkspaceFilesystem,
	WriteOptions,
} from '@n8n/agents';

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

	get readOnly() {
		return this.filesystem.readOnly;
	}

	get basePath() {
		return this.filesystem.basePath;
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

	getInstructions(): string {
		return this.filesystem.getInstructions?.() ?? '';
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
