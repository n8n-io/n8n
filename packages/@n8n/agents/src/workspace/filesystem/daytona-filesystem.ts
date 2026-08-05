/**
 * Daytona Filesystem Adapter
 *
 * Implements a native agents filesystem backed by the Daytona SDK's FileSystem API.
 * This gives Daytona workspaces all built-in workspace tools:
 * read_file, write_file, edit_file, list_files, grep, ast_edit, etc.
 *
 * Without this adapter, Daytona workspaces only get sandbox tools (execute_command).
 */
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
	WriteOptions,
} from '../types';
import { BaseFilesystem } from './base-filesystem';
import type { DaytonaSandbox } from '../sandbox/daytona-sandbox';

type DaytonaFsHandle = Parameters<Parameters<DaytonaSandbox['withFilesystem']>[0]>[0];

/**
 * A native agents filesystem implementation that delegates to the Daytona SDK's
 * sandbox.instance.fs API for all file operations.
 */
export class DaytonaFilesystem extends BaseFilesystem {
	readonly id: string;
	readonly name = 'DaytonaFilesystem';
	readonly provider = 'daytona';
	status: ProviderStatus = 'pending';

	constructor(private readonly sandbox: DaytonaSandbox) {
		super();
		this.id = `daytona-fs-${sandbox.id}`;
	}

	/**
	 * Run a filesystem op against the live Daytona handle. `withFilesystem()` ensures the
	 * sandbox is running with fresh auth and recovers once if the remote was stopped or
	 * deleted while idle, so callers never touch a stale `fs` handle directly.
	 */
	private async withFs<T>(
		op: (fs: DaytonaFsHandle) => Promise<T>,
		abortSignal?: AbortSignal,
	): Promise<T> {
		await this.ensureReady();
		return await this.sandbox.withFilesystem(op, { abortSignal });
	}

	async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
		return await this.withFs(async (fs) => {
			const buffer = await fs.downloadFile(path);
			if (options?.encoding) {
				return buffer.toString(options.encoding);
			}
			return buffer;
		}, options?.abortSignal);
	}

	async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
		await this.withFs(async (fs) => {
			if (options?.recursive) {
				const dir = path.substring(0, path.lastIndexOf('/'));
				if (dir) {
					await fs.createFolder(dir, '755');
				}
			}
			const buffer =
				typeof content === 'string' ? Buffer.from(content, 'utf-8') : Buffer.from(content);
			await fs.uploadFile(buffer, path);
		}, options?.abortSignal);
	}

	async appendFile(path: string, content: FileContent, options?: AppendOptions): Promise<void> {
		await this.withFs(async (fs) => {
			let existing: Buffer;
			try {
				existing = await fs.downloadFile(path);
			} catch (error) {
				// Only a genuinely missing file means "start empty". Sandbox/provider errors
				// (e.g. a stopped sandbox) must bubble up so withFilesystem() can recover.
				if (!isDaytona404(error)) throw error;
				existing = Buffer.alloc(0);
			}
			const append =
				typeof content === 'string' ? Buffer.from(content, 'utf-8') : Buffer.from(content);
			await fs.uploadFile(Buffer.concat([existing, append]), path);
		}, options?.abortSignal);
	}

	async deleteFile(path: string, options?: RemoveOptions): Promise<void> {
		await this.withFs(
			async (fs) => await fs.deleteFile(path, options?.recursive),
			options?.abortSignal,
		);
	}

	async copyFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await this.withFs(async (fs) => {
			const content = await fs.downloadFile(src);
			await fs.uploadFile(content, dest);
		}, options?.abortSignal);
	}

	async moveFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await this.withFs(async (fs) => await fs.moveFiles(src, dest), options?.abortSignal);
	}

	async mkdir(path: string, options?: MkdirOptions): Promise<void> {
		// createFolder with mode '755' creates intermediate dirs
		await this.withFs(async (fs) => await fs.createFolder(path, '755'), options?.abortSignal);
	}

	async rmdir(path: string, options?: RemoveOptions): Promise<void> {
		await this.withFs(
			async (fs) => await fs.deleteFile(path, options?.recursive ?? false),
			options?.abortSignal,
		);
	}

	async readdir(path: string, options?: ListOptions): Promise<FileEntry[]> {
		return await this.withFs(async (fs) => {
			const files = await fs.listFiles(path);
			return files.map((f) => ({
				name: f.name ?? '',
				type: f.isDir ? ('directory' as const) : ('file' as const),
				size: f.size,
			}));
		}, options?.abortSignal);
	}

	async exists(path: string, options?: AbortableOptions): Promise<boolean> {
		return await this.withFs(async (fs) => {
			try {
				await fs.getFileDetails(path);
				return true;
			} catch (error) {
				// A genuine 404 means the file is absent. Sandbox/provider errors (e.g. a
				// stopped sandbox) must bubble up so withFilesystem() can recover instead of
				// silently reporting the file as missing.
				if (isDaytona404(error)) return false;
				throw error;
			}
		}, options?.abortSignal);
	}

	async stat(path: string, options?: AbortableOptions): Promise<FileStat> {
		return await this.withFs(async (fs) => {
			let info;
			try {
				info = await fs.getFileDetails(path);
			} catch (error: unknown) {
				if (isDaytona404(error)) {
					throw new DaytonaFileNotFoundError(path);
				}
				throw error;
			}
			return {
				name: info.name ?? path.split('/').pop() ?? '',
				path,
				type: info.isDir ? 'directory' : 'file',
				size: info.size ?? 0,
				createdAt: new Date(info.modTime ?? 0),
				modifiedAt: new Date(info.modTime ?? 0),
			};
		}, options?.abortSignal);
	}
}

class DaytonaFileNotFoundError extends Error {
	constructor(path: string) {
		super(`File not found: ${path}`);
		this.name = 'DaytonaFileNotFoundError';
	}
}

function isDaytona404(error: unknown): boolean {
	return (
		error instanceof Error &&
		'statusCode' in error &&
		(error as { statusCode: unknown }).statusCode === 404
	);
}
