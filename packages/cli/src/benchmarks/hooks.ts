import { tmpdir } from 'node:os';
import path from 'node:path';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { Config } from '@oclif/core';
import { InstanceSettings } from 'n8n-core';
import { Start } from '@/commands/start';
import Container from 'typedi';
import { createOwner, deleteOwnerShell } from './db/users';

function n8nDir() {
	const baseDir = path.join(tmpdir(), 'n8n-benchmarks/');

	mkdirSync(baseDir, { recursive: true });

	const subDir = mkdtempSync(baseDir);
	const _n8nDir = path.join(subDir, '.n8n');

	mkdirSync(_n8nDir);

	writeFileSync(
		path.join(_n8nDir, 'config'),
		JSON.stringify({ encryptionKey: 'temp_encryption_key', instanceId: '123' }),
		'utf-8',
	);

	const instanceSettings = Container.get(InstanceSettings);
	instanceSettings.n8nFolder = _n8nDir;
	Container.set(InstanceSettings, instanceSettings);

	console.log('n8nDir', _n8nDir);
}

let main: Start;

async function mainProcess() {
	const args: string[] = [];
	const _config = new Config({ root: __dirname });

	main = new Start(args, _config);

	await main.init();
	await main.run();
}

async function setup() {
	n8nDir();

	await mainProcess();
	// @TODO: Postgres?

	await deleteOwnerShell();
	await createOwner();
}

async function teardown() {
	await main.stopProcess();
}

/** Lifecycle hooks to run once before and after all benchmarking tasks. */
export const hooks = { setup, teardown };
