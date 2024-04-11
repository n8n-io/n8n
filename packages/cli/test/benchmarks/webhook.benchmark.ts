import { BenchmarkSetup } from './benchmark-setup';
import type Bench from 'tinybench';

export function webhook(bench: Bench) {
	bench.add(
		'`start` command',
		async () => {
			console.log('iteration');
		},
		{
			beforeAll: BenchmarkSetup.beforeAll(),
			afterAll: () => {
				// @TODO stop main process gracefully
			},
		},
	);
}
