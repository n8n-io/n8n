import * as Comlink from 'comlink';
import type { RunDataWorker } from '@/app/workers/run-data/worker';

const worker = new SharedWorker(new URL('./worker.ts', import.meta.url), {
	type: 'module',
});

worker.port.start();

export const runDataWorker = Comlink.wrap<RunDataWorker>(worker.port);
