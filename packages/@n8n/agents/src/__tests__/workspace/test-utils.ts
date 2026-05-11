import { BaseFilesystem } from '../../workspace/filesystem/base-filesystem';
import { BaseSandbox } from '../../workspace/sandbox/base-sandbox';
import { ProcessHandle, SandboxProcessManager } from '../../workspace/types';
import type {
	CommandResult,
	FileContent,
	FileEntry,
	FileStat,
	ListOptions,
	MountConfig,
	ProcessInfo,
	ProviderStatus,
	ReadOptions,
	RemoveOptions,
	SpawnProcessOptions,
	WriteOptions,
} from '../../workspace/types';

// ---------------------------------------------------------------------------
// In-memory filesystem (fake)
// ---------------------------------------------------------------------------

export class InMemoryFilesystem extends BaseFilesystem {
	readonly id: string;
	readonly name = 'InMemoryFilesystem';
	readonly provider = 'memory';
	readonly basePath = '/mem';
	status: ProviderStatus = 'pending';

	private files = new Map<string, Buffer>();
	private dirs = new Set<string>();

	constructor(id = 'mem-fs') {
		super();
		this.id = id;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	override async init(): Promise<void> {
		this.dirs.add('/');
	}

	private normalizePath(p: string): string {
		return p.startsWith('/') ? p : `/${p}`;
	}

	private parentDir(p: string): string {
		const parts = p.split('/');
		parts.pop();
		return parts.join('/') || '/';
	}

	async readFile(filePath: string, options?: ReadOptions): Promise<string | Buffer> {
		await this.ensureReady();
		const p = this.normalizePath(filePath);
		const buf = this.files.get(p);
		if (!buf) throw new Error(`ENOENT: ${p}`);
		if (options?.encoding) return buf.toString(options.encoding);
		return buf;
	}

	async writeFile(filePath: string, content: FileContent, options?: WriteOptions): Promise<void> {
		await this.ensureReady();
		const p = this.normalizePath(filePath);
		if (options?.recursive) {
			this.mkdirRecursive(this.parentDir(p));
		}
		const parent = this.parentDir(p);
		if (!this.dirs.has(parent))
			throw new Error(`ENOENT: parent directory ${parent} does not exist`);
		this.files.set(p, Buffer.from(content));
	}

	async appendFile(filePath: string, content: FileContent): Promise<void> {
		await this.ensureReady();
		const p = this.normalizePath(filePath);
		const existing = this.files.get(p) ?? Buffer.alloc(0);
		const append = typeof content === 'string' ? Buffer.from(content) : Buffer.from(content);
		this.files.set(p, Buffer.concat([existing, append]));
	}

	async deleteFile(filePath: string): Promise<void> {
		await this.ensureReady();
		const p = this.normalizePath(filePath);
		if (!this.files.has(p)) throw new Error(`ENOENT: ${p}`);
		this.files.delete(p);
	}

	async copyFile(src: string, dest: string): Promise<void> {
		await this.ensureReady();
		const content = await this.readFile(src);
		await this.writeFile(dest, content);
	}

	async moveFile(src: string, dest: string): Promise<void> {
		await this.ensureReady();
		await this.copyFile(src, dest);
		await this.deleteFile(src);
	}

	async mkdir(dirPath: string, options?: { recursive?: boolean }): Promise<void> {
		await this.ensureReady();
		const p = this.normalizePath(dirPath);
		if (options?.recursive) {
			this.mkdirRecursive(p);
		} else {
			this.dirs.add(p);
		}
	}

	async rmdir(dirPath: string, options?: RemoveOptions): Promise<void> {
		await this.ensureReady();
		const p = this.normalizePath(dirPath);
		if (options?.recursive) {
			for (const key of [...this.files.keys()]) {
				if (key.startsWith(p + '/') || key === p) this.files.delete(key);
			}
			for (const d of [...this.dirs]) {
				if (d.startsWith(p + '/') || d === p) this.dirs.delete(d);
			}
		} else {
			this.dirs.delete(p);
		}
	}

	async readdir(dirPath: string, options?: ListOptions): Promise<FileEntry[]> {
		await this.ensureReady();
		const p = this.normalizePath(dirPath);
		const entries: FileEntry[] = [];
		const seen = new Set<string>();

		for (const d of this.dirs) {
			if (d === p) continue;
			if (!d.startsWith(p + '/')) continue;
			const rel = d.slice(p.length + 1);
			if (!rel) continue;
			const isDirectChild = !rel.includes('/');
			if (isDirectChild || options?.recursive) {
				const name = rel.split('/').pop()!;
				if (!seen.has(`dir:${name}`)) {
					seen.add(`dir:${name}`);
					entries.push({ name, type: 'directory' });
				}
			}
		}

		for (const [filePath] of this.files) {
			if (!filePath.startsWith(p + '/')) continue;
			const rel = filePath.slice(p.length + 1);
			if (!rel) continue;
			const isDirectChild = !rel.includes('/');
			if (isDirectChild || options?.recursive) {
				const name = filePath.split('/').pop()!;
				if (options?.extension) {
					const ext = options.extension.startsWith('.')
						? options.extension
						: `.${options.extension}`;
					if (!name.endsWith(ext)) continue;
				}
				if (!seen.has(`file:${name}`)) {
					seen.add(`file:${name}`);
					entries.push({ name, type: 'file' });
				}
			}
		}

		return entries;
	}

	async exists(filePath: string): Promise<boolean> {
		await this.ensureReady();
		const p = this.normalizePath(filePath);
		return this.files.has(p) || this.dirs.has(p);
	}

	async stat(filePath: string): Promise<FileStat> {
		await this.ensureReady();
		const p = this.normalizePath(filePath);
		const now = new Date();
		if (this.dirs.has(p)) {
			return {
				name: p.split('/').pop() ?? '/',
				path: filePath,
				type: 'directory',
				size: 0,
				createdAt: now,
				modifiedAt: now,
			};
		}
		const buf = this.files.get(p);
		if (!buf) throw new Error(`ENOENT: ${p}`);
		return {
			name: p.split('/').pop()!,
			path: filePath,
			type: 'file',
			size: buf.length,
			createdAt: now,
			modifiedAt: now,
		};
	}

	getMountConfig(): MountConfig {
		return { type: 'local', basePath: '/mem' };
	}

	getInstructions(): string {
		return 'In-memory filesystem. All file paths are relative to /mem.';
	}

	getFileContent(filePath: string): string | undefined {
		const p = this.normalizePath(filePath);
		return this.files.get(p)?.toString('utf-8');
	}

	private mkdirRecursive(p: string): void {
		const parts = p.split('/');
		let current = '';
		for (const part of parts) {
			current += current === '/' ? part : `/${part}`;
			if (!current) current = '/';
			this.dirs.add(current);
		}
	}
}

export class FakeProcessHandle extends ProcessHandle {
	readonly pid: number;
	private resolvedExitCode: number | undefined;
	private readonly outputFn: (command: string) => {
		stdout: string;
		stderr: string;
		exitCode: number;
	};
	private readonly cmdString: string;

	constructor(
		pid: number,
		command: string,
		outputFn: (cmd: string) => { stdout: string; stderr: string; exitCode: number },
	) {
		super();
		this.pid = pid;
		this.cmdString = command;
		this.command = command;
		this.outputFn = outputFn;
	}

	get exitCode(): number | undefined {
		return this.resolvedExitCode;
	}

	async kill(): Promise<boolean> {
		this.resolvedExitCode = 137;
		return await Promise.resolve(true);
	}

	async sendStdin(_data: string): Promise<void> {}

	protected async _wait(): Promise<CommandResult> {
		const result = this.outputFn(this.cmdString);
		this.emitStdout(result.stdout);
		if (result.stderr) this.emitStderr(result.stderr);
		this.resolvedExitCode = result.exitCode;

		return await Promise.resolve({
			success: result.exitCode === 0,
			exitCode: result.exitCode,
			stdout: this.stdout,
			stderr: this.stderr,
			executionTimeMs: 1,
			command: this.command,
		});
	}
}

// ---------------------------------------------------------------------------
// Fake process manager
// ---------------------------------------------------------------------------

export class FakeProcessManager extends SandboxProcessManager {
	private nextPid = 1;
	private tracked = new Map<number, FakeProcessHandle>();
	commandHandler: (command: string) => { stdout: string; stderr: string; exitCode: number };

	constructor() {
		super();
		this.commandHandler = (cmd) => ({ stdout: `executed: ${cmd}\n`, stderr: '', exitCode: 0 });
	}

	async spawn(command: string, _options?: SpawnProcessOptions): Promise<ProcessHandle> {
		const pid = this.nextPid++;
		const handle = new FakeProcessHandle(pid, command, this.commandHandler);
		this.tracked.set(pid, handle);
		return await Promise.resolve(handle);
	}

	async list(): Promise<ProcessInfo[]> {
		return await Promise.resolve(
			[...this.tracked.entries()].map(([pid, h]) => ({
				pid,
				command: h.command,
				exitCode: h.exitCode,
			})),
		);
	}

	async get(pid: number): Promise<ProcessHandle | undefined> {
		return await Promise.resolve(this.tracked.get(pid));
	}

	async kill(pid: number): Promise<boolean> {
		const h = this.tracked.get(pid);
		if (!h) return false;
		const result = await h.kill();
		this.tracked.delete(pid);
		return result;
	}
}

export class FakeSandbox extends BaseSandbox {
	readonly id: string;
	readonly name: string;
	readonly provider = 'fake';

	constructor(id: string, pm: FakeProcessManager) {
		super({ processes: pm });
		this.id = id;
		this.name = `fake-sandbox-${id}`;
	}

	async start(): Promise<void> {}
	async stop(): Promise<void> {}
	async destroy(): Promise<void> {}

	override getInstructions(): string {
		return 'Fake sandbox for executing commands.';
	}
}
