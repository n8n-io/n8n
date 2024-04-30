import path from 'node:path';
import glob from 'fast-glob';
import { jsonParse } from 'n8n-workflow';
import { readFile } from 'fs/promises';
import type { WorkflowRequest } from '@/workflows/workflow.request';
import { agent, authenticateAgent } from '../agent';
import Container from 'typedi';
import { UserRepositoryExtension } from './repository-extensions';
import { log } from '../log';

export async function seedInstanceOwner() {
	await Container.get(UserRepositoryExtension).deleteAll();

	const user = await Container.get(UserRepositoryExtension).createInstanceOwner();

	log('Seeded user in DB', user.email);
}

export async function seedWorkflows() {
	const _files = await glob('suites/workflows/*.json', {
		cwd: path.join('dist', 'benchmark'),
		absolute: true,
	});

	const payloads: WorkflowRequest.CreateUpdatePayload[] = [];

	for (const f of _files) {
		const json = await readFile(f, 'utf8');
		const payload = jsonParse<WorkflowRequest.CreatePayload>(json);
		payloads.push(payload);
	}

	await authenticateAgent();

	for (const p of payloads) {
		await agent.post('/rest/workflows', p);
	}

	const files = _files.map((f) => f.replace(/.*workflows\//, '')).join(' ');

	log('Seeded workflows in DB', files);

	return files;
}
