import { constants as fsConstants } from 'node:fs';
import {
	access,
	appendFile,
	cp,
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
	stat,
	writeFile,
} from 'node:fs/promises';
import { basename, isAbsolute, resolve } from 'node:path';

import { BaseFilesystem } from './base-filesystem';
import type {
	CopyOptions,
	FileContent,
	FileEntry,
	FileStat,
	ListOptions,
	LocalFilesystemOptions,
	ProviderStatus,
	ReadOptions,
	RemoveOptions,
	WriteOptions,
} from '../types';

/** Host filesystem rooted at a base directory. Pairs with {@link LocalSandbox}. */
export class LocalFilesystem extends BaseFilesystem {
	readonly id: string;

	readonly name = 'LocalFilesystem';

	readonly provider = 'local';

	readonly basePath: string;

	readonly readOnly?: boolean;

	status: ProviderStatus = 'pending';

	constructor(options: LocalFilesystemOptions) {
		super();
		this.basePath = options.basePath;
		this.id = options.id ?? `local-fs-${basename(options.basePath)}`;
		this.readOnly = options.readOnly;
	}

	override async init(): Promise<void> {
		await mkdir(this.basePath, { recursive: true });
	}

	/** Resolve agent-supplied paths against the base; absolute paths pass through. */
	private resolvePath(path: string): string {
		return isAbsolute(path) ? path : resolve(this.basePath, path);
	}

	async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
		await this.ensureReady();
		const buffer = await readFile(this.resolvePath(path));
		return options?.encoding ? buffer.toString(options.encoding) : buffer;
	}

	async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
		await this.ensureReady();
		const target = this.resolvePath(path);
		if (options?.recursive) {
			await mkdir(resolve(target, '..'), { recursive: true });
		}
		await writeFile(target, content);
	}

	async appendFile(path: string, content: FileContent): Promise<void> {
		await this.ensureReady();
		await appendFile(this.resolvePath(path), content);
	}

	async deleteFile(path: string, options?: RemoveOptions): Promise<void> {
		await this.ensureReady();
		await rm(this.resolvePath(path), {
			recursive: options?.recursive ?? false,
			force: options?.force ?? false,
		});
	}

	async copyFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await this.ensureReady();
		await cp(this.resolvePath(src), this.resolvePath(dest), {
			recursive: options?.recursive ?? false,
			force: options?.overwrite ?? true,
			errorOnExist: options?.overwrite === false,
		});
	}

	async moveFile(src: string, dest: string, _options?: CopyOptions): Promise<void> {
		await this.ensureReady();
		await rename(this.resolvePath(src), this.resolvePath(dest));
	}

	async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
		await this.ensureReady();
		await mkdir(this.resolvePath(path), { recursive: options?.recursive ?? false });
	}

	async rmdir(path: string, options?: RemoveOptions): Promise<void> {
		await this.deleteFile(path, { recursive: options?.recursive ?? true, force: options?.force });
	}

	async readdir(path: string, options?: ListOptions): Promise<FileEntry[]> {
		await this.ensureReady();
		const entries = await readdir(this.resolvePath(path), { withFileTypes: true });
		return entries
			.filter((entry) => !options?.extension || entry.name.endsWith(options.extension))
			.map((entry) => ({
				name: entry.name,
				type: entry.isDirectory() ? 'directory' : 'file',
			}));
	}

	async exists(path: string): Promise<boolean> {
		await this.ensureReady();
		try {
			await access(this.resolvePath(path), fsConstants.F_OK);
			return true;
		} catch {
			return false;
		}
	}

	async stat(path: string): Promise<FileStat> {
		await this.ensureReady();
		const resolved = this.resolvePath(path);
		const stats = await stat(resolved);
		return {
			name: basename(resolved),
			path: resolved,
			type: stats.isDirectory() ? 'directory' : 'file',
			size: stats.size,
			createdAt: stats.birthtime,
			modifiedAt: stats.mtime,
		};
	}
}
