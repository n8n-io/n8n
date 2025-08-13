import * as Comlink from 'comlink';
import type { ExpressionsWorker } from '@/workers/expressions/worker';

const worker = new Worker(new URL('./expressions/worker.ts', import.meta.url), {
	type: 'module',
});

export const expressionsWorker = Comlink.wrap<ExpressionsWorker>(worker);
