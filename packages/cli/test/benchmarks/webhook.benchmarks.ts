import { SetupUtils } from './setup-utils';
import type Bench from 'tinybench';

export const webhook = {
	async setup() {
		SetupUtils.n8nDir();

		await SetupUtils.mainProcess();
	},

	async teardown() {
		// ...
	},

	register(bench: Bench) {
		bench.add('Some description', async () => {
			console.log('Something happening...');
		});
	},
};

/**
 * benchmark('Some description', async () => {
 *	console.log('Something happening...');
 * });
 */
