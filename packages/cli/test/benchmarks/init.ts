import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';

import { Config } from '@oclif/core';
import { Start } from '@/commands/start';
import * as testDb from '../integration/shared/testDb';
import Container from 'typedi';
import { InstanceSettings } from 'n8n-core';

/** Set up a temp `.n8n` dir for benchmarks to use. */
function n8nDir() {
	const baseDir = join(tmpdir(), 'n8n-benchmarks/');

	mkdirSync(baseDir, { recursive: true });

	const subDir = mkdtempSync(baseDir);
	const n8nDir = join(subDir, '.n8n');

	mkdirSync(n8nDir);

	writeFileSync(
		join(n8nDir, 'config'),
		JSON.stringify({ encryptionKey: 'temp_encryption_key', instanceId: '123' }),
		'utf-8',
	);

	const instanceSettings = Container.get(InstanceSettings);
	instanceSettings.n8nFolder = n8nDir;
	Container.set(InstanceSettings, instanceSettings);

	console.log('n8nDir', n8nDir);
}

/** Initialize an n8n main process for benchmarking. */
async function mainProcess() {
	const args: string[] = [];
	const _config = new Config({ root: __dirname });

	const main = new Start(args, _config);

	await main.init();
	await main.run();
}

export const init = {
	n8nDir,
	database: testDb.init,
	mainProcess,
};
