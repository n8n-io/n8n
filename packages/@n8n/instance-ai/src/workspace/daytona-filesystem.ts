/**
 * Daytona Filesystem Adapter
 *
 * Implements MastraFilesystem backed by the Daytona SDK's FileSystem API.
 * This gives Daytona workspaces all built-in Mastra workspace tools:
 * read_file, write_file, edit_file, list_files, grep, ast_edit, etc.
 *
 * Without this adapter, Daytona workspaces only get sandbox tools (execute_command).
 */

import { MastraFilesystem } from '@mastra/core/workspace';
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
} from '@mastra/core/workspace';
import type { DaytonaSandbox } from '@mastra/daytona';

import type { Logger } from '../logger';

/**
 * A MastraFilesystem implementation that delegates to the Daytona SDK's
 * sandbox.instance.fs API for all file operations.
 */
export class DaytonaFilesystem extends MastraFilesystem {
	readonly id: string;
	readonly name = 'DaytonaFilesystem';
	readonly provider = 'daytona';
	status: ProviderStatus = 'pending';

	constructor(
		private readonly sandbox: DaytonaSandbox,
		private readonly debugLogger?: Logger,
	) {
		super({ name: 'DaytonaFilesystem' });
		this.id = `daytona-fs-${sandbox.id}`;
	}

	private get fs() {
		return this.sandbox.instance.fs;
	}

	async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
		this.debugLogger?.debug('[daytona-fs] readFile', { path, sandboxId: this.sandbox.id });
		await this.ensureReady();
		const buffer = await this.fs.downloadFile(path);
		this.debugLogger?.debug('[daytona-fs] readFile complete', {
			path,
			size: buffer.length,
			sandboxId: this.sandbox.id,
		});
		if (options?.encoding) {
			return buffer.toString(options.encoding);
		}
		return buffer;
	}

	async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
		const size = typeof content === 'string' ? content.length : content.byteLength;
		this.debugLogger?.debug('[daytona-fs] writeFile', {
			path,
			size,
			recursive: options?.recursive,
			sandboxId: this.sandbox.id,
		});
		await this.ensureReady();
		if (options?.recursive) {
			const dir = path.substring(0, path.lastIndexOf('/'));
			if (dir) {
				this.debugLogger?.debug('[daytona-fs] writeFile creating parent dir', {
					dir,
					sandboxId: this.sandbox.id,
				});
				await this.fs.createFolder(dir, '755');
			}
		}
		const buffer =
			typeof content === 'string' ? Buffer.from(content, 'utf-8') : Buffer.from(content);
		await this.fs.uploadFile(buffer, path);
		this.debugLogger?.debug('[daytona-fs] writeFile complete', {
			path,
			sandboxId: this.sandbox.id,
		});
	}

	async appendFile(path: string, content: FileContent): Promise<void> {
		this.debugLogger?.debug('[daytona-fs] appendFile', { path, sandboxId: this.sandbox.id });
		await this.ensureReady();
		let existing: Buffer;
		try {
			existing = await this.fs.downloadFile(path);
		} catch {
			existing = Buffer.alloc(0);
		}
		const append =
			typeof content === 'string' ? Buffer.from(content, 'utf-8') : Buffer.from(content);
		await this.fs.uploadFile(Buffer.concat([existing, append]), path);
		this.debugLogger?.debug('[daytona-fs] appendFile complete', {
			path,
			sandboxId: this.sandbox.id,
		});
	}

	async deleteFile(path: string, options?: RemoveOptions): Promise<void> {
		this.debugLogger?.debug('[daytona-fs] deleteFile', {
			path,
			recursive: options?.recursive,
			sandboxId: this.sandbox.id,
		});
		await this.ensureReady();
		await this.fs.deleteFile(path, options?.recursive);
		this.debugLogger?.debug('[daytona-fs] deleteFile complete', {
			path,
			sandboxId: this.sandbox.id,
		});
	}

	async copyFile(src: string, dest: string, _options?: CopyOptions): Promise<void> {
		this.debugLogger?.debug('[daytona-fs] copyFile', { src, dest, sandboxId: this.sandbox.id });
		await this.ensureReady();
		const content = await this.fs.downloadFile(src);
		await this.fs.uploadFile(content, dest);
		this.debugLogger?.debug('[daytona-fs] copyFile complete', {
			src,
			dest,
			sandboxId: this.sandbox.id,
		});
	}

	async moveFile(src: string, dest: string, _options?: CopyOptions): Promise<void> {
		this.debugLogger?.debug('[daytona-fs] moveFile', { src, dest, sandboxId: this.sandbox.id });
		await this.ensureReady();
		await this.fs.moveFiles(src, dest);
		this.debugLogger?.debug('[daytona-fs] moveFile complete', {
			src,
			dest,
			sandboxId: this.sandbox.id,
		});
	}

	async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
		this.debugLogger?.debug('[daytona-fs] mkdir', {
			path,
			recursive: options?.recursive,
			sandboxId: this.sandbox.id,
		});
		await this.ensureReady();
		if (options?.recursive) {
			// createFolder with mode '755' creates intermediate dirs
			await this.fs.createFolder(path, '755');
		} else {
			await this.fs.createFolder(path, '755');
		}
		this.debugLogger?.debug('[daytona-fs] mkdir complete', { path, sandboxId: this.sandbox.id });
	}

	async rmdir(path: string, options?: RemoveOptions): Promise<void> {
		this.debugLogger?.debug('[daytona-fs] rmdir', {
			path,
			recursive: options?.recursive,
			sandboxId: this.sandbox.id,
		});
		await this.ensureReady();
		await this.fs.deleteFile(path, options?.recursive ?? false);
		this.debugLogger?.debug('[daytona-fs] rmdir complete', { path, sandboxId: this.sandbox.id });
	}

	async readdir(path: string, _options?: ListOptions): Promise<FileEntry[]> {
		this.debugLogger?.debug('[daytona-fs] readdir', { path, sandboxId: this.sandbox.id });
		await this.ensureReady();
		const files = await this.fs.listFiles(path);
		this.debugLogger?.debug('[daytona-fs] readdir complete', {
			path,
			fileCount: files.length,
			sandboxId: this.sandbox.id,
		});
		return files.map((f) => ({
			name: f.name ?? '',
			type: f.isDir ? ('directory' as const) : ('file' as const),
			size: f.size,
		}));
	}

	async exists(path: string): Promise<boolean> {
		this.debugLogger?.debug('[daytona-fs] exists', { path, sandboxId: this.sandbox.id });
		await this.ensureReady();
		try {
			await this.fs.getFileDetails(path);
			this.debugLogger?.debug('[daytona-fs] exists — true', { path, sandboxId: this.sandbox.id });
			return true;
		} catch {
			this.debugLogger?.debug('[daytona-fs] exists — false', { path, sandboxId: this.sandbox.id });
			return false;
		}
	}

	async stat(path: string): Promise<FileStat> {
		this.debugLogger?.debug('[daytona-fs] stat', { path, sandboxId: this.sandbox.id });
		await this.ensureReady();
		const info = await this.fs.getFileDetails(path);
		this.debugLogger?.debug('[daytona-fs] stat complete', {
			path,
			isDir: info.isDir,
			size: info.size,
			sandboxId: this.sandbox.id,
		});
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
