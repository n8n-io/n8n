import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { UnexpectedError } from 'n8n-workflow';

import type { GuestRuntime, GuestSession, WasmSidecarOptions } from '../sandbox';
import { wasmReuseRuntime } from './wasm-reuse';

const PARALLEL_BUILDS = 2;

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

	const fallBack = ({ id, bundleHash }: GuestSession['manifest'], reason: string) => {
		if (!statuses.has(bundleHash)) {
			console.warn(`${id} runs in the generic guest, its snapshot ${bundleHash} failed: ${reason}`);
		}
		statuses.set(bundleHash, { id, bundleHash, fellBack: reason });
		return generic;
	};

	const build = async ({ manifest, bundleFile }: GuestSession, dir: string) => {
		const { id, bundleHash } = manifest;
		const recorded = path.join(dir, 'action.wasm.sha256');
		const { buildSnapshot } = options;
		if (!existsSync(recorded) && !buildSnapshot) return fallBack(manifest, 'no snapshot builder');
		const failure =
			existsSync(recorded) || !buildSnapshot
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
