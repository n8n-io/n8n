import { BaseFilesystem } from '../../workspace/filesystem/base-filesystem';
import type { BaseFilesystemOptions } from '../../workspace/filesystem/base-filesystem';
import type {
	FileContent,
	FileStat,
	FileEntry,
	ReadOptions,
	WriteOptions,
	ListOptions,
	RemoveOptions,
	CopyOptions,
	ProviderStatus,
} from '../../workspace/types';

class TestFilesystem extends BaseFilesystem {
	readonly id: string;
	readonly name = 'TestFS';
	readonly provider = 'test';
	status: ProviderStatus = 'pending';

	initFn = jest.fn().mockResolvedValue(undefined);
	destroyFn = jest.fn().mockResolvedValue(undefined);

	constructor(id: string, options?: BaseFilesystemOptions) {
		super(options);
		this.id = id;
	}

	override async init(): Promise<void> {
		await this.initFn();
	}

	override async destroy(): Promise<void> {
		await this.destroyFn();
	}

	async readFile(_path: string, _options?: ReadOptions): Promise<string | Buffer> {
		await this.ensureReady();
		return 'test content';
	}

	async writeFile(_path: string, _content: FileContent, _options?: WriteOptions): Promise<void> {
		await this.ensureReady();
	}

	async appendFile(_path: string, _content: FileContent): Promise<void> {
		await this.ensureReady();
	}

	async deleteFile(_path: string, _options?: RemoveOptions): Promise<void> {
		await this.ensureReady();
	}

	async copyFile(_src: string, _dest: string, _options?: CopyOptions): Promise<void> {
		await this.ensureReady();
	}

	async moveFile(_src: string, _dest: string, _options?: CopyOptions): Promise<void> {
		await this.ensureReady();
	}

	async mkdir(_path: string, _options?: { recursive?: boolean }): Promise<void> {
		await this.ensureReady();
	}

	async rmdir(_path: string, _options?: RemoveOptions): Promise<void> {
		await this.ensureReady();
	}

	async readdir(_path: string, _options?: ListOptions): Promise<FileEntry[]> {
		await this.ensureReady();
		return [];
	}

	async exists(_path: string): Promise<boolean> {
		await this.ensureReady();
		return false;
	}

	async stat(_path: string): Promise<FileStat> {
		await this.ensureReady();
		return {
			name: 'test',
			path: _path,
			type: 'file',
			size: 0,
			createdAt: new Date(),
			modifiedAt: new Date(),
		};
	}
}

describe('BaseFilesystem', () => {
	describe('lifecycle state transitions', () => {
		it('starts in pending status', () => {
			const fs = new TestFilesystem('1');
			expect(fs.status).toBe('pending');
		});

		it('transitions pending → initializing → ready on _init', async () => {
			const statuses: string[] = [];
			const fs = new TestFilesystem('1');
			fs.initFn.mockImplementation(() => {
				statuses.push(fs.status);
			});

			await fs._init();

			expect(statuses).toContain('initializing');
			expect(fs.status).toBe('ready');
		});

		it('_init is idempotent when already ready', async () => {
			const fs = new TestFilesystem('1');
			await fs._init();
			fs.initFn.mockClear();

			await fs._init();

			expect(fs.initFn).not.toHaveBeenCalled();
			expect(fs.status).toBe('ready');
		});

		it('transitions to error on init failure', async () => {
			const fs = new TestFilesystem('1');
			fs.initFn.mockRejectedValue(new Error('init boom'));

			await expect(fs._init()).rejects.toThrow('init boom');
			expect(fs.status).toBe('error');
			expect(fs.error).toBe('init boom');
		});

		it('transitions to destroyed on _destroy after ready', async () => {
			const fs = new TestFilesystem('1');
			await fs._init();

			const statuses: string[] = [];
			fs.destroyFn.mockImplementation(() => {
				statuses.push(fs.status);
			});

			await fs._destroy();

			expect(statuses).toContain('destroying');
			expect(fs.status).toBe('destroyed');
		});

		it('_destroy from pending goes directly to destroyed', async () => {
			const fs = new TestFilesystem('1');
			await fs._destroy();

			expect(fs.status).toBe('destroyed');
			expect(fs.destroyFn).not.toHaveBeenCalled();
		});

		it('_destroy is idempotent when already destroyed', async () => {
			const fs = new TestFilesystem('1');
			await fs._init();
			await fs._destroy();
			fs.destroyFn.mockClear();

			await fs._destroy();

			expect(fs.destroyFn).not.toHaveBeenCalled();
		});

		it('transitions to error on destroy failure', async () => {
			const fs = new TestFilesystem('1');
			await fs._init();
			fs.destroyFn.mockRejectedValue(new Error('destroy boom'));

			await expect(fs._destroy()).rejects.toThrow('destroy boom');
			expect(fs.status).toBe('error');
		});
	});

	describe('lifecycle hooks', () => {
		it('calls onInit hook after successful init', async () => {
			const onInit = jest.fn();
			const fs = new TestFilesystem('1', { onInit });

			await fs._init();

			expect(onInit).toHaveBeenCalledWith({ filesystem: fs });
		});

		it('does not fail when onInit hook throws', async () => {
			const onInit = jest.fn().mockRejectedValue(new Error('hook err'));
			const fs = new TestFilesystem('1', { onInit });

			await fs._init();

			expect(fs.status).toBe('ready');
		});

		it('calls onDestroy hook during destroy', async () => {
			const onDestroy = jest.fn();
			const fs = new TestFilesystem('1', { onDestroy });
			await fs._init();

			await fs._destroy();

			expect(onDestroy).toHaveBeenCalledWith({ filesystem: fs });
		});
	});

	describe('ensureReady', () => {
		it('auto-initializes when calling a fs method from pending', async () => {
			const fs = new TestFilesystem('1');

			const content = await fs.readFile('/test');

			expect(content).toBe('test content');
			expect(fs.status).toBe('ready');
		});

		it('throws if init fails when auto-initializing', async () => {
			const fs = new TestFilesystem('1');
			fs.initFn.mockRejectedValue(new Error('init fail'));

			await expect(fs.readFile('/test')).rejects.toThrow();
		});
	});

	describe('concurrent lifecycle calls', () => {
		it('deduplicates concurrent _init calls', async () => {
			const fs = new TestFilesystem('1');
			let resolveInit: () => void;
			fs.initFn.mockImplementation(
				async () =>
					await new Promise<void>((r) => {
						resolveInit = r;
					}),
			);

			const p1 = fs._init();
			const p2 = fs._init();

			resolveInit!();
			await Promise.all([p1, p2]);

			expect(fs.initFn).toHaveBeenCalledTimes(1);
			expect(fs.status).toBe('ready');
		});

		it('deduplicates concurrent _destroy calls', async () => {
			const fs = new TestFilesystem('1');
			await fs._init();

			let resolveDestroy!: () => void;
			fs.destroyFn.mockImplementation(
				async () =>
					await new Promise<void>((r) => {
						resolveDestroy = r;
					}),
			);

			const p1 = fs._destroy();
			// Flush microtasks so executeDestroy reaches destroyFn
			await Promise.resolve();
			await Promise.resolve();
			const p2 = fs._destroy();

			resolveDestroy();
			await Promise.all([p1, p2]);

			expect(fs.destroyFn).toHaveBeenCalledTimes(1);
			expect(fs.status).toBe('destroyed');
		});
	});
});
