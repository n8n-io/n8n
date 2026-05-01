import type {
	ProviderStatus,
	WorkspaceFilesystem,
	FileContent,
	FileStat,
	FileEntry,
	ReadOptions,
	WriteOptions,
	ListOptions,
	RemoveOptions,
	CopyOptions,
} from '../types';

export type FilesystemLifecycleHook = (args: {
	filesystem: WorkspaceFilesystem;
}) => void | Promise<void>;

export interface BaseFilesystemOptions {
	onInit?: FilesystemLifecycleHook;
	onDestroy?: FilesystemLifecycleHook;
}

export abstract class BaseFilesystem implements WorkspaceFilesystem {
	abstract readonly id: string;
	abstract readonly name: string;
	abstract readonly provider: string;
	abstract status: ProviderStatus;

	error?: string;

	private initPromise?: Promise<void>;
	private destroyPromise?: Promise<void>;
	private readonly onInitHook?: FilesystemLifecycleHook;
	private readonly onDestroyHook?: FilesystemLifecycleHook;

	constructor(options?: BaseFilesystemOptions) {
		this.onInitHook = options?.onInit;
		this.onDestroyHook = options?.onDestroy;
	}

	async _init(): Promise<void> {
		if (
			this.status === 'ready' ||
			this.status === 'destroying' ||
			this.status === 'destroyed' ||
			this.status === 'error'
		) {
			return;
		}

		if (this.initPromise) return await this.initPromise;

		this.initPromise = this.executeInit();
		try {
			await this.initPromise;
		} finally {
			this.initPromise = undefined;
		}
	}

	private async executeInit(): Promise<void> {
		this.status = 'initializing';
		this.error = undefined;

		try {
			await this.init();
			this.status = 'ready';
			try {
				await this.onInitHook?.({ filesystem: this });
			} catch {
				// Non-fatal: bad callback shouldn't kill a healthy filesystem
			}
		} catch (error) {
			this.status = 'error';
			this.error = error instanceof Error ? error.message : String(error);
			throw error;
		}
	}

	async init(): Promise<void> {
		// Default no-op — subclasses override
	}

	protected async ensureReady(): Promise<void> {
		if (this.status !== 'ready') {
			await this._init();
		}
		if (this.status !== 'ready') {
			throw new Error(`Filesystem "${this.id}" is not ready (status: ${this.status})`);
		}
	}

	async _destroy(): Promise<void> {
		if (this.status === 'destroyed') return;

		if (this.status === 'pending') {
			this.status = 'destroyed';
			return;
		}

		if (this.destroyPromise) return await this.destroyPromise;

		this.destroyPromise = this.executeDestroy();
		try {
			await this.destroyPromise;
		} finally {
			this.destroyPromise = undefined;
		}
	}

	private async executeDestroy(): Promise<void> {
		if (this.initPromise) {
			try {
				await this.initPromise;
			} catch {
				// Ignore init errors — destroying anyway
			}
		}

		this.status = 'destroying';
		try {
			await this.onDestroyHook?.({ filesystem: this });
		} catch {
			// Non-fatal: bad callback shouldn't prevent actual cleanup
		}
		try {
			await this.destroy();
			this.status = 'destroyed';
		} catch (error) {
			this.status = 'error';
			this.error = error instanceof Error ? error.message : String(error);
			throw error;
		}
	}

	async destroy(): Promise<void> {
		// Default no-op — subclasses override
	}

	abstract readFile(path: string, options?: ReadOptions): Promise<string | Buffer>;
	abstract writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void>;
	abstract appendFile(path: string, content: FileContent): Promise<void>;
	abstract deleteFile(path: string, options?: RemoveOptions): Promise<void>;
	abstract copyFile(src: string, dest: string, options?: CopyOptions): Promise<void>;
	abstract moveFile(src: string, dest: string, options?: CopyOptions): Promise<void>;
	abstract mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
	abstract rmdir(path: string, options?: RemoveOptions): Promise<void>;
	abstract readdir(path: string, options?: ListOptions): Promise<FileEntry[]>;
	abstract exists(path: string): Promise<boolean>;
	abstract stat(path: string): Promise<FileStat>;
}
