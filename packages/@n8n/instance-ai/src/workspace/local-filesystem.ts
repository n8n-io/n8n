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
	lstat,
	mkdir,
	readdir,
	readFile,
	realpath,
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

function isNotFoundError(error: unknown): boolean {
	if (typeof error !== 'object' || error === null) return false;
	return Reflect.get(error, 'code') === 'ENOENT';
}

class PathEscapesWorkspaceError extends Error {}

export class LocalFilesystem extends BaseFilesystem {
	readonly id: string;
	readonly name = 'LocalFilesystem';
	readonly provider = 'local';
	readonly readOnly?: boolean;
	readonly basePath: string;
	status: ProviderStatus = 'pending';

	private readonly contained: boolean;
	private readonly instructions?: string;
	private realBasePath: string | undefined;

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
		this.realBasePath = await realpath(this.basePath);
	}

	async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
		await this.ensureReady();
		const content = await readFile(await this.resolveExistingPath(path));
		return options?.encoding ? content.toString(options.encoding) : content;
	}

	async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
		await this.ensureReady();
		this.assertWritable();
		const filePath = await this.resolveWritablePath(path);
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
		const filePath = await this.resolveWritablePath(path);
		await writeFile(filePath, toBuffer(content), { flag: 'a' });
	}

	async deleteFile(path: string, options?: RemoveOptions): Promise<void> {
		await this.ensureReady();
		this.assertWritable();
		const filePath = options?.force
			? await this.resolveWritablePath(path)
			: await this.resolveExistingPath(path);
		await rm(filePath, {
			recursive: options?.recursive ?? false,
			force: options?.force ?? false,
		});
	}

	async copyFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await this.ensureReady();
		this.assertWritable();
		const srcPath = await this.resolveExistingPath(src);
		const destPath = await this.resolveWritablePath(dest);
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
		const srcPath = await this.resolveExistingPath(src);
		const destPath = await this.resolveWritablePath(dest);
		if (options?.overwrite === false && (await this.exists(dest))) {
			throw new Error(`Path already exists: ${dest}`);
		}
		await mkdir(dirname(destPath), { recursive: true });
		await rename(srcPath, destPath);
	}

	async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
		await this.ensureReady();
		this.assertWritable();
		await mkdir(await this.resolveWritablePath(path), { recursive: options?.recursive ?? false });
	}

	async rmdir(path: string, options?: RemoveOptions): Promise<void> {
		await this.deleteFile(path, { recursive: options?.recursive, force: options?.force });
	}

	async readdir(path: string, options?: ListOptions): Promise<FileEntry[]> {
		await this.ensureReady();
		const entries = await this.readDirectory(
			await this.resolveExistingPath(path),
			options?.recursive ?? false,
		);
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
			await access(await this.resolveExistingPath(path));
			return true;
		} catch (error) {
			if (error instanceof PathEscapesWorkspaceError) throw error;
			return false;
		}
	}

	async stat(path: string): Promise<FileStat> {
		await this.ensureReady();
		const filePath = await this.resolveExistingPath(path);
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

	private resolvePathLexically(inputPath: string): string {
		const filePath = isAbsolute(inputPath)
			? resolve(inputPath)
			: resolve(join(this.basePath, inputPath));
		if (this.contained && !isPathInside(filePath, this.basePath)) {
			throw new Error(`Path escapes local workspace root: ${inputPath}`);
		}
		return filePath;
	}

	private async resolveExistingPath(inputPath: string): Promise<string> {
		const filePath = this.resolvePathLexically(inputPath);
		await this.assertExistingPathContained(filePath, inputPath);
		return filePath;
	}

	private async resolveWritablePath(inputPath: string): Promise<string> {
		const filePath = this.resolvePathLexically(inputPath);
		if (!this.contained) return filePath;

		try {
			await this.assertExistingPathContained(filePath, inputPath);
			return filePath;
		} catch (error) {
			if (!isNotFoundError(error)) throw error;
		}

		await this.assertNearestExistingParentContained(filePath, inputPath);
		return filePath;
	}

	private async assertExistingPathContained(filePath: string, inputPath: string): Promise<void> {
		if (!this.contained) return;
		const [realFilePath, realBasePath] = await Promise.all([
			realpath(filePath),
			this.getRealBasePath(),
		]);
		if (!isPathInside(realFilePath, realBasePath)) {
			throw new PathEscapesWorkspaceError(`Path escapes local workspace root: ${inputPath}`);
		}
	}

	private async assertNearestExistingParentContained(
		filePath: string,
		inputPath: string,
	): Promise<void> {
		let parentPath = dirname(filePath);
		while (true) {
			try {
				await this.assertExistingPathContained(parentPath, inputPath);
				return;
			} catch (error) {
				if (!isNotFoundError(error)) throw error;
			}

			const nextParentPath = dirname(parentPath);
			if (nextParentPath === parentPath)
				throw new Error(`Path has no existing parent: ${inputPath}`);
			parentPath = nextParentPath;
		}
	}

	private async getRealBasePath(): Promise<string> {
		this.realBasePath ??= await realpath(this.basePath);
		return this.realBasePath;
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
			await this.assertExistingPathContained(entryPath, entryPath);
			const linkInfo = await lstat(entryPath);
			const info = await stat(entryPath);
			const isDirectory = info.isDirectory();
			entries.push({
				name: dirent.name,
				type: isDirectory ? 'directory' : 'file',
				size: info.size,
			});
			if (recursive && isDirectory && !linkInfo.isSymbolicLink()) {
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
