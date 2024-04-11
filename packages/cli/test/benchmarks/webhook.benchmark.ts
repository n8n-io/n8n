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

				await init.database();
				await init.mainProcess();

				console.log('beforeAll end');
			},
			afterAll: () => {
				// stop process // @TODO
			},
		},
	);
}
