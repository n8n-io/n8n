import { Config } from '@oclif/core';
import { Start } from '@/commands/start';

export async function startCommand() {
	const args: string[] = [];
	const _config = new Config({ root: __dirname });

	const cmd = new Start(args, _config);

	await cmd.init();
	await cmd.run();
}

export const init = {
	// database: testDb.init,
	startCommand,
};
