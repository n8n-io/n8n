import type Bench from 'tinybench';

import { init } from './init';

export function webhook(bench: Bench) {
	bench.add(
		'`start` command',
		async () => {
			console.log('iteration');
		},
		{
			beforeAll: async () => {
				console.log('beforeAll start');

				await import('../../src/constants');

				init.n8nDir();
				// await init.database(); // @TODO: Test with Postgres
				await init.mainProcess();

				console.log('beforeAll end');
			},
			afterAll: () => {
				// @TODO stop main process gracefully
			},
		},
	);
}
