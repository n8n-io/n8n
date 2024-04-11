import type Bench from 'tinybench';

import { init } from './init';

export function webhook(bench: Bench) {
	bench.add(
		'`start` command',
		async () => {
			// console.log('ended');
			console.log(bench.iterations);
		},
		{
			beforeAll: async () => {
				console.log('beforeAll start');

				await init.startCommand();
				// await init.database();

				console.log('beforeAll end');
			},
		},
	);
}
