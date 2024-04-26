import path from 'node:path';
import glob from 'fast-glob';
import { jsonParse } from 'n8n-workflow';
import { readFile } from 'fs/promises';
import type { WorkflowRequest } from '@/workflows/workflow.request';
import { agent, authenticateAgent } from '../agent';
import Container from 'typedi';
import { UserRepositoryExtension } from './repository-extensions';

export async function seedInstanceOwner() {
	await Container.get(UserRepositoryExtension).deleteAll();
	await Container.get(UserRepositoryExtension).createInstanceOwner();
}

export async function seedWorkflows() {
	const files = await glob('suites/workflows/*.json', {
		cwd: path.join('dist', 'benchmark'),
		absolute: true,
	});

	const payloads: WorkflowRequest.CreateUpdatePayload[] = [];

	for (const file of files) {
		const json = await readFile(file, 'utf8');
		const payload = jsonParse<WorkflowRequest.CreatePayload>(json);
		payloads.push(payload);
	}

	await authenticateAgent();

	for (const p of payloads) {
		await agent.post('/rest/workflows', p);
	}
}
