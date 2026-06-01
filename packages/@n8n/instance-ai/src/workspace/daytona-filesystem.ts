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
	FileContent,
	FileStat,
	FileEntry,
	ReadOptions,
	WriteOptions,
	ListOptions,
	RemoveOptions,
	CopyOptions,
	ProviderStatus,
} from '@n8n/agents';
import { BaseFilesystem } from '@n8n/agents';

import type { DaytonaSandbox } from './daytona-sandbox';

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

	private get fs() {
		return this.sandbox.instance.fs;
	}

	private async prepare(): Promise<void> {
		// `ensureAuthFresh()` triggers a proactive JWT refresh + sandbox refetch if the
		// cached client is near expiry, so `this.fs` (bound to the underlying Sandbox)
		// points at a client with valid auth.
		await this.ensureReady();
		await this.sandbox.ensureAuthFresh();
	}

	async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
		await this.prepare();
		const buffer = await this.fs.downloadFile(path);
		if (options?.encoding) {
			return buffer.toString(options.encoding);
		}
		return buffer;
	}

	async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
		await this.prepare();
		if (options?.recursive) {
			const dir = path.substring(0, path.lastIndexOf('/'));
			if (dir) {
				await this.fs.createFolder(dir, '755');
			}
		}
		const buffer =
			typeof content === 'string' ? Buffer.from(content, 'utf-8') : Buffer.from(content);
		await this.fs.uploadFile(buffer, path);
	}

	async appendFile(path: string, content: FileContent): Promise<void> {
		await this.prepare();
		let existing: Buffer;
		try {
			existing = await this.fs.downloadFile(path);
		} catch {
			existing = Buffer.alloc(0);
		}
		const append =
			typeof content === 'string' ? Buffer.from(content, 'utf-8') : Buffer.from(content);
		await this.fs.uploadFile(Buffer.concat([existing, append]), path);
	}

	async deleteFile(path: string, options?: RemoveOptions): Promise<void> {
		await this.prepare();
		await this.fs.deleteFile(path, options?.recursive);
	}

	async copyFile(src: string, dest: string, _options?: CopyOptions): Promise<void> {
		await this.prepare();
		const content = await this.fs.downloadFile(src);
		await this.fs.uploadFile(content, dest);
	}

	async moveFile(src: string, dest: string, _options?: CopyOptions): Promise<void> {
		await this.prepare();
		await this.fs.moveFiles(src, dest);
	}

	async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
		await this.prepare();
		if (options?.recursive) {
			// createFolder with mode '755' creates intermediate dirs
			await this.fs.createFolder(path, '755');
		} else {
			await this.fs.createFolder(path, '755');
		}
	}

	async rmdir(path: string, options?: RemoveOptions): Promise<void> {
		await this.prepare();
		await this.fs.deleteFile(path, options?.recursive ?? false);
	}

	async readdir(path: string, _options?: ListOptions): Promise<FileEntry[]> {
		await this.prepare();
		const files = await this.fs.listFiles(path);
		return files.map((f) => ({
			name: f.name ?? '',
			type: f.isDir ? ('directory' as const) : ('file' as const),
			size: f.size,
		}));
	}

	async exists(path: string): Promise<boolean> {
		await this.prepare();
		try {
			await this.fs.getFileDetails(path);
			return true;
		} catch {
			return false;
		}
	}

	async stat(path: string): Promise<FileStat> {
		await this.prepare();
		let info;
		try {
			info = await this.fs.getFileDetails(path);
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
