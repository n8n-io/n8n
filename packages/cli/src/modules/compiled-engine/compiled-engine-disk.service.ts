import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { BinaryDataConfig } from 'n8n-core';
import type { Dirent } from 'node:fs';
import {
	chmod,
	mkdir,
	readdir,
	readFile,
	rm,
	stat,
	statfs,
	unlink,
	utimes,
	writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

import { CompiledEngineProcesses } from './compiled-engine-processes';
import { CompiledExecutionStore } from './compiled-execution.store';

/** Modes of the files and folders that this module writes. */
const FILE_MODE = 0o600;
const DIR_MODE = 0o700;

const BYTES_PER_MB = 1024 * 1024;
const HOUR_MS = 60 * 60 * 1000;

/** A left-over `wfrt-<id>` folder must be this old before a sweep deletes it. */
const ORPHAN_AGE_MS = HOUR_MS;

/** A sweep reads and deletes at most this many runtime folders. */
const MAX_SWEEP_ENTRIES = 10_000;

/** Measuring a big binary store stops after this many entries. */
const MAX_MEASURE_ENTRIES = 100_000;

/** The volume of the data folder warns below this free ratio. */
const MIN_FREE_RATIO = 0.1;

/** Prefix of the execution part of a binary data location of a production run. */
const RUNTIME_LOCATION_PREFIX = 'wfrt-';

const ARTIFACT_SUFFIX = '.json';

/** The names of the files of the artifact cache, keyed by size, least recently used first. */
type ArtifactSizes = Map<string, number>;

/**
 * A size-bounded cache of compiled workflow artifacts in a folder. Eviction drops
 * the least recently used file. Recency is the order of use in this process,
 * seeded with the file modification time at start; a hit sets the file
 * modification time to now, so recency survives a restart.
 *
 * Every write keeps the total under the limit. Files from an earlier process
 * are picked up when the cache first reads or writes.
 */
export class ArtifactCache {
	private readonly sizes: ArtifactSizes = new Map();

	private loaded?: Promise<void>;

	/** Writes run one at a time, so the sizes and the folder stay in step. */
	private queue: Promise<unknown> = Promise.resolve();

	constructor(
		private readonly dir: string,
		private readonly limitBytes: number,
	) {}

	/** The stored text of a key, or `undefined` when the cache does not hold it. */
	async read(key: string): Promise<string | undefined> {
		await this.ensureLoaded();
		const path = this.pathOf(key);
		let contents: string;
		try {
			contents = await readFile(path, 'utf8');
		} catch {
			this.sizes.delete(key);
			return undefined;
		}
		await this.markUsed(path, key, Buffer.byteLength(contents));
		return contents;
	}

	/** Stores the text of a key and drops the least recently used files above the limit. */
	async write(key: string, contents: string): Promise<void> {
		if (this.limitBytes <= 0) return;
		await this.ensureLoaded();
		await this.serial(async () => {
			await ensureDir(this.dir);
			const path = this.pathOf(key);
			await writeFile(path, contents, { mode: FILE_MODE });
			// `mode` of `writeFile` applies only to a new file.
			await chmod(path, FILE_MODE).catch(() => {});
			this.remember(key, Buffer.byteLength(contents));
			await this.evict();
		});
	}

	/** Records a use of a key without reading it, for a hit in memory. */
	async touch(key: string): Promise<void> {
		await this.ensureLoaded();
		if (!this.sizes.has(key)) return;
		await this.markUsed(this.pathOf(key), key, this.sizes.get(key) ?? 0);
	}

	/** The bytes of the files in the cache. */
	async bytes(): Promise<number> {
		await this.ensureLoaded();
		return this.totalBytes();
	}

	private async ensureLoaded(): Promise<void> {
		this.loaded ??= this.serial(async () => await this.load());
		await this.loaded;
	}

	private async load(): Promise<void> {
		let entries: Dirent[];
		try {
			entries = await readdir(this.dir, { withFileTypes: true });
		} catch {
			return;
		}
		const files: Array<{ key: string; size: number; usedAt: number }> = [];
		for (const entry of entries) {
			if (!entry.isFile() || !entry.name.endsWith(ARTIFACT_SUFFIX)) continue;
			try {
				const info = await stat(join(this.dir, entry.name));
				files.push({
					key: entry.name.slice(0, -ARTIFACT_SUFFIX.length),
					size: info.size,
					usedAt: info.mtimeMs,
				});
			} catch {
				// The file went away: it is not in the cache.
			}
		}
		files.sort((a, b) => a.usedAt - b.usedAt);
		for (const file of files) this.sizes.set(file.key, file.size);
		await this.evict();
	}

	private async evict(): Promise<void> {
		let total = this.totalBytes();
		while (total > this.limitBytes) {
			const oldest = this.sizes.keys().next();
			if (oldest.done) return;
			const key: string = oldest.value;
			total -= this.sizes.get(key) ?? 0;
			this.sizes.delete(key);
			await unlink(this.pathOf(key)).catch(() => {});
		}
	}

	private async markUsed(path: string, key: string, size: number): Promise<void> {
		const now = new Date();
		try {
			await utimes(path, now, now);
		} catch {
			this.sizes.delete(key);
			return;
		}
		this.remember(key, size);
	}

	/** Moves a key to the newest position. */
	private remember(key: string, size: number): void {
		this.sizes.delete(key);
		this.sizes.set(key, size);
	}

	private totalBytes(): number {
		let total = 0;
		for (const size of this.sizes.values()) total += size;
		return total;
	}

	private pathOf(key: string): string {
		return join(this.dir, `${key}${ARTIFACT_SUFFIX}`);
	}

	private async serial<T>(work: () => Promise<T>): Promise<T> {
		const next = this.queue.then(work, work);
		this.queue = next.catch(() => {});
		return await next;
	}
}

/** Creates a folder that only the n8n user can enter, also when it exists already. */
export async function ensureDir(dir: string): Promise<void> {
	await mkdir(dir, { recursive: true, mode: DIR_MODE });
	await chmod(dir, DIR_MODE).catch(() => {});
}

/** The bytes of the files under a folder. A folder that is not there counts as empty. */
export async function folderBytes(root: string): Promise<number> {
	let total = 0;
	let scanned = 0;
	const pending = [root];
	while (pending.length > 0 && scanned < MAX_MEASURE_ENTRIES) {
		const dir = pending.pop();
		if (dir === undefined) break;
		let entries: Dirent[];
		try {
			entries = await readdir(dir, { withFileTypes: true });
		} catch {
			continue;
		}
		for (const entry of entries) {
			if (scanned >= MAX_MEASURE_ENTRIES) break;
			scanned += 1;
			const path = join(dir, entry.name);
			if (entry.isDirectory()) {
				pending.push(path);
			} else if (entry.isFile()) {
				try {
					total += (await stat(path)).size;
				} catch {
					// The file went away: it counts as empty.
				}
			}
		}
	}
	return total;
}

/** The free part of the volume of a folder, as a ratio, or `undefined` when unknown. */
async function freeRatio(path: string): Promise<number | undefined> {
	try {
		const info = await statfs(path);
		const total = info.blocks * info.bsize;
		if (total <= 0) return undefined;
		return (info.bavail * info.bsize) / total;
	} catch {
		return undefined;
	}
}

/** A `wfrt-<id>` folder of the binary store. */
interface RuntimeFolder {
	path: string;
	wfrtId: string;
}

export interface CompiledEngineDiskUsage {
	artifactBytes: number;
	binaryDataBytes: number;
	logBytes: number;
	freeRatio?: number;
}

/**
 * Keeps the disk use of the compiled engine bounded and private: sweeps the
 * binary data folders of runs that n8n never saved, and reports the disk use
 * every hour.
 */
@Service()
export class CompiledEngineDiskService {
	private timer?: NodeJS.Timeout;

	private busy = false;

	constructor(
		private readonly processes: CompiledEngineProcesses,
		private readonly store: CompiledExecutionStore,
		private readonly binaryDataConfig: BinaryDataConfig,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('compiled-engine');
	}

	/** Creates the folders of the module and starts the hourly sweep and report. */
	async start(): Promise<void> {
		if (this.timer) return;
		await this.prepareFolders().catch((error) => {
			this.logger.warn('Could not prepare the folders of the compiled engine', {
				error: error instanceof Error ? error.message : String(error),
			});
		});
		this.timer = setInterval(() => {
			this.run().catch(() => {});
		}, HOUR_MS);
		// The sweep must not keep the process alive.
		this.timer.unref();
		void this.run();
	}

	stop(): void {
		clearInterval(this.timer);
		this.timer = undefined;
	}

	private async run(): Promise<void> {
		if (this.busy) return;
		this.busy = true;
		try {
			await this.sweep();
			await this.report();
		} catch (error) {
			this.logger.warn('Could not sweep the files of the compiled engine', {
				error: error instanceof Error ? error.message : String(error),
			});
		} finally {
			this.busy = false;
		}
	}

	private get dataDir() {
		return this.processes.dataDir;
	}

	/** The log folder that `wfrt` gets as `--log-dir`. */
	private get logDir() {
		return join(this.dataDir, 'log');
	}

	private get artifactDir() {
		return join(this.dataDir, 'artifacts');
	}

	private async prepareFolders(): Promise<void> {
		for (const dir of [this.dataDir, this.artifactDir, this.logDir]) {
			await ensureDir(dir);
		}
	}

	/**
	 * Deletes the binary data folders of production runs that n8n never saved:
	 * `wfrt-<id>` folders older than one hour with no execution row for the id.
	 */
	async sweep(
		options: { now?: number; maxEntries?: number } = {},
	): Promise<{ removed: number; scanned: number }> {
		const now = options.now ?? Date.now();
		const maxEntries = options.maxEntries ?? MAX_SWEEP_ENTRIES;
		const folders = await this.runtimeFolders(maxEntries);
		let removed = 0;
		for (const folder of folders) {
			try {
				await this.restrictFolder(folder);
				const info = await stat(folder.path);
				if (now - info.mtimeMs < ORPHAN_AGE_MS) continue;
				if ((await this.store.findExecutionId(folder.wfrtId)) !== undefined) continue;
				await rm(folder.path, { recursive: true, force: true });
				removed += 1;
			} catch (error) {
				this.logger.debug('Could not remove a left-over binary data folder', {
					path: folder.path,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		if (removed > 0) {
			this.logger.info(`Removed ${removed} left-over binary data folders of the compiled engine`);
		}
		return { removed, scanned: folders.length };
	}

	/**
	 * Closes a `wfrt-<id>` folder to other users. The runtime writes the files
	 * with the process umask, and they hold the data of a run.
	 */
	private async restrictFolder(folder: RuntimeFolder): Promise<void> {
		await chmod(folder.path, DIR_MODE).catch(() => {});
		await chmod(join(folder.path, 'binary_data'), DIR_MODE).catch(() => {});
	}

	/** Collects the `wfrt-<id>` folders of the binary store, up to `maxEntries`. */
	private async runtimeFolders(maxEntries: number): Promise<RuntimeFolder[]> {
		if (this.binaryDataConfig.mode !== 'filesystem') return [];
		const root = join(this.binaryDataConfig.localStoragePath, 'workflows');
		let workflows: Dirent[];
		try {
			workflows = await readdir(root, { withFileTypes: true });
		} catch {
			return [];
		}
		const folders: RuntimeFolder[] = [];
		for (const workflow of workflows) {
			if (folders.length >= maxEntries) break;
			if (!workflow.isDirectory()) continue;
			const executionsDir = join(root, workflow.name, 'executions');
			let executions: Dirent[];
			try {
				executions = await readdir(executionsDir, { withFileTypes: true });
			} catch {
				continue;
			}
			for (const execution of executions) {
				if (folders.length >= maxEntries) break;
				if (!execution.isDirectory()) continue;
				if (!execution.name.startsWith(RUNTIME_LOCATION_PREFIX)) continue;
				const wfrtId = execution.name.slice(RUNTIME_LOCATION_PREFIX.length);
				if (wfrtId.length === 0) continue;
				folders.push({ path: join(executionsDir, execution.name), wfrtId });
			}
		}
		return folders;
	}

	/** Logs the bytes of the files of the module, and warns when the volume is nearly full. */
	async report(): Promise<CompiledEngineDiskUsage> {
		const usage: CompiledEngineDiskUsage = {
			artifactBytes: await folderBytes(this.artifactDir),
			binaryDataBytes:
				this.binaryDataConfig.mode === 'filesystem'
					? await folderBytes(join(this.binaryDataConfig.localStoragePath, 'workflows'))
					: 0,
			logBytes: await folderBytes(this.logDir),
			freeRatio: await freeRatio(this.dataDir),
		};
		this.logger.info(
			`Compiled engine disk use: ${mb(usage.artifactBytes)} artifacts, ${mb(usage.binaryDataBytes)} binary data, ${mb(usage.logBytes)} log`,
			{
				artifactBytes: usage.artifactBytes,
				binaryDataBytes: usage.binaryDataBytes,
				logBytes: usage.logBytes,
			},
		);
		if (usage.freeRatio !== undefined && usage.freeRatio < MIN_FREE_RATIO) {
			this.logger.warn(
				`The volume of the compiled engine data folder has ${Math.round(usage.freeRatio * 100)}% free space left`,
			);
		}
		return usage;
	}
}

function mb(bytes: number): string {
	return `${(bytes / BYTES_PER_MB).toFixed(1)} MB`;
}
