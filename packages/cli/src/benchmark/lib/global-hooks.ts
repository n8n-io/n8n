import { tmpdir } from 'node:os';
import path from 'node:path';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { Config } from '@oclif/core';
import { InstanceSettings } from 'n8n-core';
import { Start } from '@/commands/start';
import Container from 'typedi';
import { WorkflowsController } from '@/workflows/workflows.controller';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import type { User } from '@/databases/entities/User';
import glob from 'fast-glob';
import { jsonParse } from 'n8n-workflow';
import { readFile } from 'fs/promises';
import type { WorkflowRequest } from '@/workflows/workflow.request';

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
	const files = await glob('fixtures/*.json', {
		cwd: path.join('dist', 'benchmark'),
		absolute: true,
	});

	const fixtures: WorkflowRequest.CreatePayload[] = [];

	for (const file of files) {
		const content = await readFile(file, 'utf8');
		fixtures.push(jsonParse<WorkflowRequest.CreatePayload>(content));
	}

	for (const fixture of fixtures) {
		// @ts-ignore @TODO Fix typing
		await Container.get(WorkflowsController).create({ body: fixture, user: owner });
	}

	const allActive = await Container.get(WorkflowRepository).getAllActive();
	console.log('allActive', allActive);
}

export async function setup() {
	n8nDir();

	await mainProcess();
	// @TODO: Postgres?

	const owner = await Container.get(UserRepository).createTestOwner();

	await loadFixtures(owner);
}

export async function teardown() {
	await main.stopProcess();
}
