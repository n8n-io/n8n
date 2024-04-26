import { tmpdir } from 'node:os';
import path from 'node:path';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { Config } from '@oclif/core';
import { InstanceSettings } from 'n8n-core';
import { Start } from '@/commands/start';
import Container from 'typedi';
import { UserRepository } from '@/databases/repositories/user.repository';
import glob from 'fast-glob';
import { jsonParse } from 'n8n-workflow';
import { readFile } from 'fs/promises';
import type { WorkflowRequest } from '@/workflows/workflow.request';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { Logger } from '@/Logger';
import { agent, authenticateAgent } from './agent';

const logger = Container.get(Logger);

function tempN8nDir() {
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

	logger.info(`[Benchmarking] Temp .n8n dir location: ${instanceSettings.n8nFolder}`);
}

async function loadWorkflows() {
	const files = await glob('suites/workflows/*.json', {
		cwd: path.join('dist', 'benchmark'),
		absolute: true,
	});

	const workflows: WorkflowRequest.CreatePayload[] = [];

	for (const file of files) {
		const content = await readFile(file, 'utf8');
		workflows.push(jsonParse<WorkflowRequest.CreatePayload>(content));
	}

	await authenticateAgent();

	for (const workflow of workflows) {
		await agent.post('/rest/workflows', workflow);
	}
}

let main: Start;

export async function globalSetup() {
	tempN8nDir();

	main = new Start([], new Config({ root: __dirname }));

	await main.init();
	await main.run();

	await Container.get(UserRepository).createTestOwner();

	await loadWorkflows();

	await Container.get(ActiveWorkflowRunner).init();
}

export async function globalTeardown() {
	await main.stopProcess();
}
