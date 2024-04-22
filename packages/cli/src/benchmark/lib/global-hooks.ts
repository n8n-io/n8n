import { tmpdir } from 'node:os';
import path from 'node:path';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { Config } from '@oclif/core';
import { InstanceSettings } from 'n8n-core';
import { Start } from '@/commands/start';
import Container from 'typedi';
import FixtureWorkflow2fZ from '../fixtures/1.1.json';
import { WorkflowsController } from '@/workflows/workflows.controller';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import type { User } from '@/databases/entities/User';

function n8nDir() {
	const baseDirPath = path.join(tmpdir(), 'n8n-benchmarks/');

	mkdirSync(baseDirPath, { recursive: true });

	const userDir = mkdtempSync(baseDirPath);

	const _n8nDir = path.join(userDir, '.n8n');

	mkdirSync(_n8nDir);

	writeFileSync(
		path.join(_n8nDir, 'config'),
		JSON.stringify({ encryptionKey: 'temp_encryption_key', instanceId: 'temp-123' }),
		'utf-8',
	);

	/**
	 * @TODO Better approach than overriding? Setting N8N_USER_FOLDER has no effect
	 */
	const instanceSettings = Container.get(InstanceSettings);
	instanceSettings.n8nFolder = _n8nDir;
	Container.set(InstanceSettings, instanceSettings);

	console.info('.n8n dir', _n8nDir);
}

let main: Start;

async function mainProcess() {
	const args: string[] = [];
	const _config = new Config({ root: __dirname });

	main = new Start(args, _config);

	await main.init();
	await main.run();
}

async function loadFixtures(owner: User) {
	// @ts-ignore
	await Container.get(WorkflowsController).create({ body: FixtureWorkflow2fZ, user: owner });

	const allActive = await Container.get(WorkflowRepository).getAllActive();
	console.log('allActive', allActive);
}

export async function setup() {
	n8nDir();

	await mainProcess();
	// @TODO: Postgres?

	const owner = await Container.get(UserRepository).testOwner();

	await loadFixtures(owner);
}

export async function teardown() {
	await main.stopProcess();
}
