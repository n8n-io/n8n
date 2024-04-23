import { tmpdir } from 'node:os';
import path from 'node:path';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { Config } from '@oclif/core';
import { InstanceSettings } from 'n8n-core';
import { Start } from '@/commands/start';
import Container from 'typedi';
import { WorkflowsController } from '@/workflows/workflows.controller';
import { UserRepository } from '@/databases/repositories/user.repository';
import type { User } from '@/databases/entities/User';
import glob from 'fast-glob';
import { jsonParse } from 'n8n-workflow';
import { readFile } from 'fs/promises';
import type { WorkflowRequest } from '@/workflows/workflow.request';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { Logger } from '@/Logger';

/**
 * Create a temp `.n8n` dir for encryption key, sqlite DB, etc.
 */
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

	// @TODO: Find better approach than overriding like this
	// Setting N8N_USER_FOLDER has no effect
	const instanceSettings = Container.get(InstanceSettings);
	instanceSettings.n8nFolder = _n8nDir;
	Container.set(InstanceSettings, instanceSettings);

	Container.get(Logger).info(`Temp .n8n dir location: ${instanceSettings.n8nFolder}`);
}

/**
 * Load into DB and activate in memory all workflows to use in benchmarks.
 */
async function prepareWorkflows(owner: User) {
	const files = await glob('workflows/*.json', {
		cwd: path.join('dist', 'benchmark'),
		absolute: true,
	});

	const workflows: WorkflowRequest.CreatePayload[] = [];

	for (const file of files) {
		const content = await readFile(file, 'utf8');
		workflows.push(jsonParse<WorkflowRequest.CreatePayload>(content));
	}

	for (const workflow of workflows) {
		// @ts-ignore @TODO Fix typing
		await Container.get(WorkflowsController).create({ body: workflow, user: owner });
	}

	await Container.get(ActiveWorkflowRunner).init();
}

let main: Start;

/**
 * Start the main n8n process to use in benchmarks.
 */
async function mainProcess() {
	const args: string[] = [];
	const _config = new Config({ root: __dirname });

	main = new Start(args, _config);

	await main.init();
	await main.run();
}

/**
 * Setup to run before once all benchmarks.
 */
export async function globalSetup() {
	n8nDir();

	await mainProcess();

	const owner = await Container.get(UserRepository).createTestOwner();

	await prepareWorkflows(owner); // @TODO: Load all here or as part of each benchmark's `beforeEach`?
}

/**
 * Teardown to run after all benchmarks.
 */
export async function globalTeardown() {
	await main.stopProcess();
}
