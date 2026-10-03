// The guest runtimes of the benchmark and the conformance matrix, by name.
import { existsSync } from 'node:fs';
import path from 'node:path';

import { CONTAINER_GUEST, containerRuntime } from '../src/runtimes/container';
import { wasmSnapshotRuntime } from '../src/runtimes/wasm-snapshot';
import { WORKER_GUEST, workerRuntime } from '../src/runtimes/worker';
import type { GuestRuntime } from '../src/sandbox';
import { childProcessSnapshotBuilder } from './snapshot-bundle';

const SANDBOX = path.resolve(__dirname, '..', 'sandbox');
const SIDECAR = path.join(SANDBOX, 'sidecar/target/release/n8n-sandbox');
const GUESTS = path.join(SANDBOX, 'dist');

export const IN_PROCESS = 'in-process';

const unavailable = (name: string, reason: string) =>
	new Error(`${name} is not available: ${reason}`);

/** Every file must exist, else the runtime is not available. */
const built = (name: string, files: readonly string[]) => {
	const missing = files.filter((file) => !existsSync(file));
	if (missing.length > 0) throw unavailable(name, `${missing.join(', ')} not built`);
};

const RUNTIMES: Readonly<Record<string, () => GuestRuntime>> = {
	worker: () => {
		built('worker', [WORKER_GUEST]);
		return workerRuntime();
	},
	wasm: () => {
		built('wasm', [SIDECAR, path.join(GUESTS, 'action.wasm')]);
		return wasmSnapshotRuntime({
			sidecar: SIDECAR,
			guests: GUESTS,
			buildSnapshot: childProcessSnapshotBuilder(),
		});
	},
	container: () => {
		built('container', [CONTAINER_GUEST]);
		return containerRuntime();
	},
};

export const RUNTIME_NAMES = [IN_PROCESS, ...Object.keys(RUNTIMES)];

/**
 * The runtime of `name`, or `undefined` for `in-process`, where the bundle runs in this process
 * through `loadExecutor`. Throws when the runtime is not available.
 */
export async function runtimeByName(name: string): Promise<GuestRuntime | undefined> {
	if (name === IN_PROCESS) return undefined;
	const make = RUNTIMES[name];
	if (!make) throw unavailable(name, `no such runtime, choose from ${RUNTIME_NAMES.join(', ')}`);
	return make();
}
