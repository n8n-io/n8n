import { tmpdir } from 'node:os';
import path from 'node:path';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';

import { Config } from '@oclif/core';
import { Start } from '@/commands/start';
import Container from 'typedi';
import { InstanceSettings } from 'n8n-core';

export class BenchmarkSetup {
	/** Setup to run before all iterations of a single benchmark. */
	static beforeAll() {
		return async () => {
			this.n8nDir();

			await this.mainProcess();
		};
	}

	static n8nDir() {
		const baseDir = path.join(tmpdir(), 'n8n-benchmarks/');

		mkdirSync(baseDir, { recursive: true });

		const subDir = mkdtempSync(baseDir);
		const n8nDir = path.join(subDir, '.n8n');

		mkdirSync(n8nDir);

		writeFileSync(
			path.join(n8nDir, 'config'),
			JSON.stringify({ encryptionKey: 'temp_encryption_key', instanceId: '123' }),
			'utf-8',
		);

		const instanceSettings = Container.get(InstanceSettings);
		instanceSettings.n8nFolder = n8nDir;
		Container.set(InstanceSettings, instanceSettings);

		console.log('n8nDir', n8nDir);
	}

	static async mainProcess() {
		const args: string[] = [];
		const _config = new Config({ root: __dirname });

		const main = new Start(args, _config);

		await main.init();
		await main.run();
	}
}
