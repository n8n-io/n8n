import { Config } from '@oclif/core';
import { Start } from '@/commands/start';
import * as testDb from '../integration/shared/testDb';

async function mainProcess() {
	const args: string[] = [];
	const _config = new Config({ root: __dirname });

	const main = new Start(args, _config);

	await main.init();
	await main.run();
}

export const init = {
	database: testDb.init,
	mainProcess,
};
