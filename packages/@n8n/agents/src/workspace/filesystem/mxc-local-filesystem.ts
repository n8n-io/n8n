import { constants, promises as fs } from 'node:fs';
import { basename, dirname, isAbsolute, join, parse, resolve } from 'node:path';

import { BaseFilesystem, type BaseFilesystemOptions } from './base-filesystem';
import { isPathInside, type MxcSandbox } from '../sandbox/mxc-sandbox';
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

type Access = 'read' | 'write';

/** O_NOFOLLOW is not available on Windows. There, the canonical path check stays the guard. */
const NO_FOLLOW = constants.O_NOFOLLOW ?? 0;

const MAX_SYMLINK_HOPS = 40;

/** HOME and TMPDIR of sandboxed commands. They are not the agent's files. */
const SCRATCH_DIRS = new Set(['.home', '.tmp']);

async function lstatOrUndefined(path: string) {
	try {
		return await fs.lstat(path);
	} catch (error) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
		throw error;
	}
}

/**
 * Resolves every symlink in the path, also links whose target does not exist yet. A plain
 * realpath check is not enough: a dangling link counts as inside the workspace, but a write
 * through it creates the target outside.
 */
export async function canonicalizePath(path: string): Promise<string> {
	const { root } = parse(path);
	const pending = path
		.slice(root.length)
		.split(/[\\/]+/)
		.filter(Boolean);
	let current = root;
	let hops = 0;
	while (pending.length > 0) {
		const segment = pending.shift();
		if (segment === undefined || segment === '.') continue;
		if (segment === '..') {
			current = dirname(current);
			continue;
		}
		const next = join(current, segment);
		const stats = await lstatOrUndefined(next);
		if (!stats?.isSymbolicLink()) {
			current = next;
			continue;
		}
		if (++hops > MAX_SYMLINK_HOPS) throw new Error(`Too many symbolic links in "${path}"`);
		const target = await fs.readlink(next);
		const targetPath = isAbsolute(target) ? target : join(current, target);
		const parsedTarget = parse(targetPath);
		pending.unshift(
			...targetPath
				.slice(parsedTarget.root.length)
				.split(/[\\/]+/)
				.filter(Boolean),
		);
		current = parsedTarget.root;
	}
	return current;
}

/**
 * Host filesystem for the file tools, confined to the folders of an MXC sandbox: the workspace
 * (read and write) and the input folders (read only). Denied folders win over both. File tools
 * run in the n8n process, so this class enforces the confinement. MXC enforces it for commands.
 *
 * Reports `provider: 'local'` with a `basePath`, so the workspace root is the host folder.
 */
export class MxcLocalFilesystem extends BaseFilesystem {
	readonly id: string;

	readonly name = 'MxcLocalFilesystem';

	readonly provider = 'local';

	readonly basePath: string;

	status: ProviderStatus = 'pending';

	private readonly readonlyRoots: string[];

	private readonly deniedRoots: string[];

	constructor(
		private readonly sandbox: MxcSandbox,
		options?: BaseFilesystemOptions,
	) {
		super(options);
		this.id = `mxc-fs-${sandbox.id}`;
		this.basePath = sandbox.workspaceDir;
		this.readonlyRoots = sandbox.readonlyPaths;
		this.deniedRoots = sandbox.deniedPaths;
	}

	/** Fails closed like the sandbox: no file access when MXC is not available on the host. */
	override async init(): Promise<void> {
		await this.sandbox._start();
		await fs.mkdir(this.basePath, { recursive: true });
	}

	getInstructions(): string {
		return `Files are on the local machine. Your workspace folder is ${this.basePath}.`;
	}

	async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
		const target = await this.resolvePath(path, 'read');
		const handle = await fs.open(target, constants.O_RDONLY | NO_FOLLOW);
		try {
			const content = await handle.readFile();
			return options?.encoding ? content.toString(options.encoding) : content;
		} finally {
			await handle.close();
		}
	}

	async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
		const target = await this.resolvePath(path, 'write');
		if (options?.recursive) await fs.mkdir(dirname(target), { recursive: true });
		const exclusive = options?.overwrite === false ? constants.O_EXCL : constants.O_TRUNC;
		await this.writeNoFollow(target, content, constants.O_WRONLY | constants.O_CREAT | exclusive);
	}

	async appendFile(path: string, content: FileContent, _options?: AppendOptions): Promise<void> {
		const target = await this.resolvePath(path, 'write');
		await this.writeNoFollow(
			target,
			content,
			constants.O_WRONLY | constants.O_CREAT | constants.O_APPEND,
		);
	}

	async deleteFile(path: string, options?: RemoveOptions): Promise<void> {
		// Delete a link itself, not the file that it points to.
		const target = await this.resolvePath(path, 'write', { keepLeafLink: true });
		if (target === (await canonicalizePath(this.basePath))) {
			throw new Error('The workspace root cannot be deleted');
		}
		await fs.rm(target, { recursive: options?.recursive ?? false, force: options?.force ?? false });
	}

	async copyFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		const from = await this.resolvePath(src, 'read');
		const to = await this.resolvePath(dest, 'write');
		if ((await fs.stat(from)).isDirectory()) {
			// Links are copied as links. Later file operations resolve them and check the target.
			await fs.cp(from, to, {
				recursive: options?.recursive,
				force: options?.overwrite ?? true,
				errorOnExist: options?.overwrite === false,
				verbatimSymlinks: true,
			});
			return;
		}
		const content = await this.readFile(from);
		const exclusive = options?.overwrite === false ? constants.O_EXCL : constants.O_TRUNC;
		await this.writeNoFollow(to, content, constants.O_WRONLY | constants.O_CREAT | exclusive);
	}

	async moveFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		const from = await this.resolvePath(src, 'write', { keepLeafLink: true });
		const to = await this.resolvePath(dest, 'write', { keepLeafLink: true });
		if (options?.overwrite === false && (await lstatOrUndefined(to))) {
			throw new Error(`Destination already exists: ${dest}`);
		}
		await fs.rename(from, to);
	}

	async mkdir(path: string, options?: MkdirOptions): Promise<void> {
		await fs.mkdir(await this.resolvePath(path, 'write'), { recursive: options?.recursive });
	}

	async rmdir(path: string, options?: RemoveOptions): Promise<void> {
		await this.deleteFile(path, options);
	}

	async readdir(path: string, options?: ListOptions): Promise<FileEntry[]> {
		const target = await this.resolvePath(path, 'read');
		const workspace = await canonicalizePath(this.basePath);
		const entries = await fs.readdir(target, {
			withFileTypes: true,
			recursive: options?.recursive ?? false,
		});
		const result: FileEntry[] = [];
		for (const entry of entries) {
			if (!entry.isFile() && !entry.isDirectory()) continue;
			if (options?.extension && entry.isFile() && !entry.name.endsWith(options.extension)) continue;
			const fullPath = resolve(entry.parentPath, entry.name);
			if (
				isPathInside(fullPath, workspace) &&
				SCRATCH_DIRS.has(relativeHead(workspace, fullPath))
			) {
				continue;
			}
			result.push({
				name: fullPath.slice(target.length + 1),
				type: entry.isDirectory() ? 'directory' : 'file',
				...(entry.isFile() ? { size: (await fs.stat(fullPath)).size } : {}),
			});
		}
		return result;
	}

	async exists(path: string, _options?: AbortableOptions): Promise<boolean> {
		const target = await this.resolvePath(path, 'read', { keepLeafLink: true });
		return (await lstatOrUndefined(target)) !== undefined;
	}

	async stat(path: string, _options?: AbortableOptions): Promise<FileStat> {
		const target = await this.resolvePath(path, 'read');
		const stats = await fs.stat(target);
		return {
			name: basename(target),
			path: target,
			type: stats.isDirectory() ? 'directory' : 'file',
			size: stats.size,
			createdAt: stats.birthtime,
			modifiedAt: stats.mtime,
		};
	}

	/**
	 * Resolves a path from a tool to its canonical host path and checks that it stays inside an
	 * allowed folder. Callers must use the returned path, so that the checked path is the one used.
	 */
	async resolvePath(
		path: string,
		access: Access,
		{ keepLeafLink = false }: { keepLeafLink?: boolean } = {},
	): Promise<string> {
		await this.ensureReady();
		const requested = isAbsolute(path) ? resolve(path) : resolve(this.basePath, path);
		// With keepLeafLink, only the parent folders are resolved, so an operation on a link acts
		// on the link itself. The link name is then checked like any other path in that folder.
		const target = keepLeafLink
			? join(await canonicalizePath(dirname(requested)), basename(requested))
			: await canonicalizePath(requested);

		for (const denied of this.deniedRoots) {
			if (isPathInside(target, await canonicalizePath(denied))) {
				throw new Error(`Access denied: "${path}" is in a protected folder.`);
			}
		}
		if (isPathInside(target, await canonicalizePath(this.basePath))) return target;
		if (access === 'read') {
			for (const root of this.readonlyRoots) {
				if (isPathInside(target, await canonicalizePath(root))) return target;
			}
		}
		const scope = access === 'read' ? 'read' : 'write';
		throw new Error(
			`Access denied: "${path}" is outside the folders the agent can ${scope}. Use a path in ${this.basePath}.`,
		);
	}

	private async writeNoFollow(target: string, content: FileContent, flags: number): Promise<void> {
		const handle = await fs.open(target, flags | NO_FOLLOW, 0o644);
		try {
			await handle.writeFile(content);
		} finally {
			await handle.close();
		}
	}
}

function relativeHead(root: string, path: string): string {
	return path.slice(root.length + 1).split(/[\\/]/)[0] ?? '';
}
