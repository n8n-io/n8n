import * as Comlink from 'comlink';
import type { RunDataWorker } from '@/workers/run-data/worker';

const worker = new Worker(new URL('./worker.ts', import.meta.url), {
	type: 'module',
});

export const runDataWorker = Comlink.wrap<RunDataWorker>(worker);
