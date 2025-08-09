import { createWorker } from 'typed-worker';
import { type Actions } from './expressions-worker';

export const expressionsWorker = createWorker<Actions>(
	() =>
		new Worker(new URL('./expressions-worker.ts', import.meta.url), {
			type: 'module',
		}),
);
