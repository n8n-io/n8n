import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile, rm, stat, utimes } from 'node:fs/promises';
import path from 'node:path';
import { UnexpectedError } from 'n8n-workflow';

import type { GuestRuntime, GuestSession, WasmSidecarOptions } from '../sandbox';
import { wasmReuseRuntime } from './wasm-reuse';

const PARALLEL_BUILDS = 2;

/**
 * The most disk space of the snapshots and their compiled components in one cache directory. A
 * snapshot takes about 50 MB (a 13 MB component and a 35–39 MB `.cwasm`), so 2 GiB keeps about 40.
 */
const MAX_CACHE_BYTES = 2 * 1024 ** 3;

const sha256Of = async (file: string) =>
	createHash('sha256')
		.update(await readFile(file))
		.digest('hex');

/** The innermost cause of a failed build, e.g. the Wizer error: the last error line of its stderr. */
const reasonOf = (error: unknown) => {
	const text =
		error instanceof Error ? `${String(Reflect.get(error, 'stderr') ?? '')}\n${error.message}` : '';
	const head = text.split(/\n\s+at /)[0] ?? '';
	const line = head
		.split('\n')
		.filter((each) => /Error: /.test(each))
		.at(-1);
	return (line ?? (error instanceof Error ? error.message : String(error))).trim();
};

type ReuseRuntime = ReturnType<typeof wasmReuseRuntime>;

/** One snapshot build: `outDir` gets `action.wasm` and `action.wasm.sha256`. */
export interface SnapshotJob {
	/** The guest build with the template `action-snapshot.js`. */
	readonly guests: string;
	readonly bundleFile: string;
	readonly bundleSha256: string;
	readonly outDir: string;
}

export interface WasmSnapshotOptions extends WasmSidecarOptions {
	/**
	 * Builds the snapshot of one bundle, for example `scripts/snapshot-bundle.ts` in a child process.
	 * Without it, every action runs in the generic guest, as in `wasmReuseRuntime`.
	 */
	readonly buildSnapshot?: (job: SnapshotJob) => Promise<void>;
	/** The most bytes of the snapshots and their `.cwasm` files in one cache directory. Default: 2 GiB. */
	readonly maxCacheBytes?: number;
}

/** A snapshot in the cache: its directory and its `.cwasm` files, which the sidecar compiled from it. */
interface CachedSnapshot {
	readonly dir: string;
	readonly compiled: readonly string[];
	readonly bytes: number;
	readonly compiledBytes: number;
	readonly modifiedMs: number;
}

const sizeOf = async (file: string) => (await stat(file).catch(() => undefined))?.size ?? 0;
const sumOf = (sizes: readonly number[]) => sizes.reduce((sum, size) => sum + size, 0);

async function cachedSnapshotsOf(cacheDir: string): Promise<CachedSnapshot[]> {
	const root = path.join(cacheDir, 'snapshots');
	const [names, files] = await Promise.all([
		readdir(root).catch((): string[] => []),
		readdir(cacheDir).catch((): string[] => []),
	]);
	return await Promise.all(
		// A build writes to a `.partial` directory and renames it when it is complete.
		names
			.filter((name) => !name.endsWith('.partial'))
			.map(async (name) => {
				const dir = path.join(root, name);
				const digest = await readFile(path.join(dir, 'action.wasm.sha256'), 'utf8').catch(
					() => undefined,
				);
				// The sidecar names a compiled component `<digest>-<engine>.cwasm`.
				const compiled = files
					.filter((file) => digest && file.startsWith(`${digest}-`) && file.endsWith('.cwasm'))
					.map((file) => path.join(cacheDir, file));
				const own = ['action.wasm', 'action.wasm.sha256'].map((file) => path.join(dir, file));
				const [ownBytes, compiledBytes, modifiedMs] = await Promise.all([
					Promise.all(own.map(sizeOf)).then(sumOf),
					Promise.all(compiled.map(sizeOf)).then(sumOf),
					// A parallel build can remove the directory after `readdir`.
					stat(dir).then(
						({ mtimeMs }) => mtimeMs,
						() => 0,
					),
				]);
				return { dir, compiled, bytes: ownBytes + compiledBytes, compiledBytes, modifiedMs };
			}),
	);
}

/** Whether an action runs in its snapshot, and why not. */
export interface SnapshotStatus {
	readonly id: string;
	readonly bundleHash: string;
	readonly fellBack?: string;
}

/**
 * Like `wasmReuseRuntime`, but an action runs in a component built for its bundle: the bundle is
 * evaluated in the Wizer snapshot, not at the first call of each instance. The first session of a
 * bundle builds the component from `<guests>/action-snapshot.js` with `buildSnapshot` into
 * `<cacheDir>/snapshots`, keyed on the bundle and the template digest.
 *
 * The snapshots and their `.cwasm` files take at most `maxCacheBytes` in each cache directory: a
 * new build removes the snapshots used longest ago. Use one runtime for each cache directory.
 *
 * A snapshot changes only the speed. A provider, and a bundle whose snapshot does not build, run
 * in the generic guest. For example, Wizer refuses a bundle that calls an import (`Math.random`)
 * at its top level.
 */
export function wasmSnapshotRuntime(
	options: WasmSnapshotOptions,
): GuestRuntime & { close(): void; snapshotStatus(): SnapshotStatus[] } {
	const generic = wasmReuseRuntime(options);
	const snapshots = new Map<string, Promise<ReuseRuntime>>();
	const statuses = new Map<string, SnapshotStatus>();
	const shared = new Map<'template', Promise<string>>();
	const once = async (key: 'template', make: () => Promise<string>) => {
		const value = shared.get(key) ?? make();
		shared.set(key, value);
		return await value;
	};
	const slots = { free: PARALLEL_BUILDS };
	const waiting: Array<() => void> = [];
	const limited = async <T>(work: () => Promise<T>) => {
		if (slots.free > 0) slots.free -= 1;
		else await new Promise<void>((resolve) => waiting.push(resolve));
		try {
			return await work();
		} finally {
			const next = waiting.shift();
			if (next) next();
			else slots.free += 1;
		}
	};

	// The order in which this runtime used its snapshots, so the cache removes the oldest first.
	const used = new Map<string, number>();
	const uses = { count: 0 };
	/**
	 * Removes the snapshots used longest ago until the cache fits `maxCacheBytes`, but not `keep`.
	 * This process keeps the digest of each component that it started (`guestSha256Of`), so a
	 * snapshot that this runtime loaded loses only its `.cwasm` files: a new sidecar compiles them
	 * again.
	 * Only this runtime instance knows which snapshots it loaded. Use one instance for each cache
	 * directory: another instance can remove a component that this instance still uses.
	 * The `.cwasm` of a new snapshot comes at its first session, so the cache can be larger than the
	 * cap by one compiled component until the next build.
	 */
	const evict = async (cacheDir: string, keep: string) => {
		const cached = await cachedSnapshotsOf(cacheDir);
		const loaded = (dir: string) => snapshots.has(dir);
		const oldestFirst = cached
			.filter(({ dir }) => dir !== keep)
			.sort((a, b) =>
				loaded(a.dir) === loaded(b.dir)
					? (used.get(a.dir) ?? a.modifiedMs) - (used.get(b.dir) ?? b.modifiedMs)
					: loaded(a.dir)
						? 1
						: -1,
			);
		const { removed } = oldestFirst.reduce<{ over: number; removed: string[] }>(
			({ over, removed: files }, { dir, compiled, bytes, compiledBytes }) => {
				if (over <= 0) return { over, removed: files };
				return loaded(dir)
					? { over: over - compiledBytes, removed: [...files, ...compiled] }
					: { over: over - bytes, removed: [...files, ...compiled, dir] };
			},
			{
				over: sumOf(cached.map(({ bytes }) => bytes)) - (options.maxCacheBytes ?? MAX_CACHE_BYTES),
				removed: [],
			},
		);
		await Promise.all(
			removed.map(async (file) => await rm(file, { recursive: true, force: true })),
		);
	};

	const fallBack = ({ id, bundleHash }: GuestSession['manifest'], reason: string) => {
		if (!statuses.has(bundleHash)) {
			console.warn(`${id} runs in the generic guest, its snapshot ${bundleHash} failed: ${reason}`);
		}
		statuses.set(bundleHash, { id, bundleHash, fellBack: reason });
		return generic;
	};

	const build = async ({ manifest, bundleFile, cacheDir }: GuestSession, dir: string) => {
		const { id, bundleHash } = manifest;
		const recorded = path.join(dir, 'action.wasm.sha256');
		const { buildSnapshot } = options;
		if (!existsSync(recorded) && !buildSnapshot) return fallBack(manifest, 'no snapshot builder');
		const builds = !existsSync(recorded) && buildSnapshot !== undefined;
		const failure = !builds
			? undefined
			: await limited(
					async () =>
						await buildSnapshot({
							guests: options.guests,
							bundleFile,
							bundleSha256: bundleHash,
							outDir: dir,
						}),
				).then(() => undefined, reasonOf);
		if (failure !== undefined) return fallBack(manifest, failure);
		if ((await readFile(recorded, 'utf8')) !== (await sha256Of(path.join(dir, 'action.wasm')))) {
			throw new UnexpectedError(`The snapshot of ${id} does not match its digest`);
		}
		statuses.set(bundleHash, { id, bundleHash });
		// The eviction only frees disk space. Its failure must not stop a good snapshot.
		if (builds) {
			await evict(cacheDir, dir).catch((error: unknown) => {
				console.warn(
					`The snapshot cache ${cacheDir} cannot remove old snapshots: ${reasonOf(error)}`,
				);
			});
		}
		// The time of the directory orders the snapshots that no runtime of this process used.
		else await utimes(dir, new Date(), new Date()).catch(() => undefined);
		return wasmReuseRuntime({ sidecar: options.sidecar, guests: dir });
	};

	const runtimeOf = async (session: GuestSession) => {
		const { manifest, cacheDir } = session;
		const template = await once(
			'template',
			async () => await sha256Of(path.join(options.guests, 'action-snapshot.js')),
		).then(
			(digest) => ({ digest }),
			(error: unknown) => ({ error: reasonOf(error) }),
		);
		if ('error' in template) return fallBack(manifest, template.error);
		const dir = path.join(
			cacheDir,
			'snapshots',
			`${manifest.bundleHash}-${template.digest.slice(0, 16)}`,
		);
		uses.count += 1;
		used.set(dir, uses.count);
		const runtime = snapshots.get(dir) ?? build(session, dir);
		snapshots.set(dir, runtime);
		return await runtime;
	};

	return {
		name: 'wasm-snapshot',
		async start(session) {
			if (session.kind !== 'action') return await generic.start(session);
			return await (await runtimeOf(session)).start(session);
		},
		close() {
			generic.close();
			snapshots.forEach((runtime) => {
				runtime.then(
					(each) => each.close(),
					() => undefined,
				);
			});
			snapshots.clear();
		},
		snapshotStatus: () => [...statuses.values()],
	};
}
