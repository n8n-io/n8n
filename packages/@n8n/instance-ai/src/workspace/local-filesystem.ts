import type {
	CopyOptions,
	FileContent,
	FileEntry,
	FileStat,
	ListOptions,
	ProviderStatus,
	ReadOptions,
	RemoveOptions,
	WriteOptions,
} from '@n8n/agents';
import { BaseFilesystem } from '@n8n/agents';
import {
	access,
	copyFile,
	cp,
	mkdir,
	readdir,
	readFile,
	rename,
	rm,
	stat,
	writeFile,
} from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';

export interface LocalFilesystemOptions {
	id?: string;
	basePath: string;
	contained?: boolean;
	readOnly?: boolean;
	instructions?: string;
}

function toBuffer(content: FileContent): Buffer {
	return typeof content === 'string' ? Buffer.from(content, 'utf-8') : Buffer.from(content);
}

function isPathInside(childPath: string, parentPath: string): boolean {
	const rel = relative(parentPath, childPath);
	return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export class LocalFilesystem extends BaseFilesystem {
	readonly id: string;
	readonly name = 'LocalFilesystem';
	readonly provider = 'local';
	readonly readOnly?: boolean;
	readonly basePath: string;
	status: ProviderStatus = 'pending';

	private readonly contained: boolean;
	private readonly instructions?: string;

	constructor(options: LocalFilesystemOptions) {
		super();
		this.id = options.id ?? `local-fs-${Buffer.from(resolve(options.basePath)).toString('hex')}`;
		this.basePath = resolve(options.basePath);
		this.contained = options.contained ?? true;
		this.readOnly = options.readOnly;
		this.instructions = options.instructions;
	}

	override async init(): Promise<void> {
		await mkdir(this.basePath, { recursive: true });
	}

	async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
		await this.ensureReady();
		const content = await readFile(this.resolvePath(path));
		return options?.encoding ? content.toString(options.encoding) : content;
	}

	async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
		await this.ensureReady();
		this.assertWritable();
		const filePath = this.resolvePath(path);
		if (options?.recursive) {
			await mkdir(dirname(filePath), { recursive: true });
		}
		if (options?.overwrite === false && (await this.exists(path))) {
			throw new Error(`File already exists: ${path}`);
		}
		await writeFile(filePath, toBuffer(content));
	}

	async appendFile(path: string, content: FileContent): Promise<void> {
		await this.ensureReady();
		this.assertWritable();
		const filePath = this.resolvePath(path);
		await writeFile(filePath, toBuffer(content), { flag: 'a' });
	}

	async deleteFile(path: string, options?: RemoveOptions): Promise<void> {
		await this.ensureReady();
		this.assertWritable();
		await rm(this.resolvePath(path), {
			recursive: options?.recursive ?? false,
			force: options?.force ?? false,
		});
	}

	async copyFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await this.ensureReady();
		this.assertWritable();
		const srcPath = this.resolvePath(src);
		const destPath = this.resolvePath(dest);
		const srcStat = await stat(srcPath);
		if (options?.recursive || srcStat.isDirectory()) {
			await cp(srcPath, destPath, {
				recursive: true,
				force: options?.overwrite ?? true,
				errorOnExist: options?.overwrite === false,
			});
			return;
		}
		await mkdir(dirname(destPath), { recursive: true });
		if (options?.overwrite === false && (await this.exists(dest))) {
			throw new Error(`File already exists: ${dest}`);
		}
		await copyFile(srcPath, destPath);
	}

	async moveFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await this.ensureReady();
		this.assertWritable();
		const destPath = this.resolvePath(dest);
		if (options?.overwrite === false && (await this.exists(dest))) {
			throw new Error(`Path already exists: ${dest}`);
		}
		await mkdir(dirname(destPath), { recursive: true });
		await rename(this.resolvePath(src), destPath);
	}

	async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
		await this.ensureReady();
		this.assertWritable();
		await mkdir(this.resolvePath(path), { recursive: options?.recursive ?? false });
	}

	async rmdir(path: string, options?: RemoveOptions): Promise<void> {
		await this.deleteFile(path, { recursive: options?.recursive, force: options?.force });
	}

	async readdir(path: string, options?: ListOptions): Promise<FileEntry[]> {
		await this.ensureReady();
		const entries = await this.readDirectory(this.resolvePath(path), options?.recursive ?? false);
		const extension = options?.extension
			? options.extension.startsWith('.')
				? options.extension
				: `.${options.extension}`
			: undefined;

		return entries.filter(
			(entry) => !extension || entry.type === 'directory' || entry.name.endsWith(extension),
		);
	}

	async exists(path: string): Promise<boolean> {
		await this.ensureReady();
		try {
			await access(this.resolvePath(path));
			return true;
		} catch {
			return false;
		}
	}

	async stat(path: string): Promise<FileStat> {
		await this.ensureReady();
		const filePath = this.resolvePath(path);
		const info = await stat(filePath);
		return {
			name: basename(filePath),
			path,
			type: info.isDirectory() ? 'directory' : 'file',
			size: info.size,
			createdAt: info.birthtime,
			modifiedAt: info.mtime,
		};
	}

	getMountConfig(): { type: 'local'; basePath: string } {
		return { type: 'local', basePath: this.basePath };
	}

	getInstructions(): string {
		return (
			this.instructions ??
			`Local filesystem rooted at ${this.basePath}. Use paths relative to this directory.`
		);
	}

	private resolvePath(inputPath: string): string {
		const filePath = isAbsolute(inputPath)
			? resolve(inputPath)
			: resolve(join(this.basePath, inputPath));
		if (this.contained && !isPathInside(filePath, this.basePath)) {
			throw new Error(`Path escapes local workspace root: ${inputPath}`);
		}
		return filePath;
	}

	private assertWritable(): void {
		if (this.readOnly) {
			throw new Error(`Filesystem "${this.id}" is read-only`);
		}
	}

	private async readDirectory(path: string, recursive: boolean): Promise<FileEntry[]> {
		const dirents = await readdir(path, { withFileTypes: true });
		const entries: FileEntry[] = [];
		for (const dirent of dirents) {
			const entryPath = join(path, dirent.name);
			const info = await stat(entryPath);
			entries.push({
				name: dirent.name,
				type: dirent.isDirectory() ? 'directory' : 'file',
				size: info.size,
			});
			if (recursive && dirent.isDirectory()) {
				const nested = await this.readDirectory(entryPath, true);
				entries.push(
					...nested.map((entry) => ({
						...entry,
						name: join(dirent.name, entry.name),
					})),
				);
			}
		}
		return entries;
	}
}
