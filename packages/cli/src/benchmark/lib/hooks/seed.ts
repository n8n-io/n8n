import path from 'node:path';
import glob from 'fast-glob';
import { jsonParse } from 'n8n-workflow';
import { readFile } from 'fs/promises';
import type { WorkflowRequest } from '@/workflows/workflow.request';
import { agent, authenticateAgent } from '../agent';
import Container from 'typedi';
import { UserRepository } from '../repositories/user.benchmark-repository';
// @TODO: @benchmark path

export async function seedInstanceOwner() {
	await Container.get(UserRepository).deleteInstanceOwner();
	await Container.get(UserRepository).createInstanceOwner();
}

export async function seedWorkflows() {
	const files = await glob('suites/workflows/*.json', {
		cwd: path.join('dist', 'benchmark'),
		absolute: true,
	});

	const workflowpayloads: WorkflowRequest.CreateUpdatePayload[] = [];

	for (const file of files) {
		const json = await readFile(file, 'utf8');
		const payload = jsonParse<WorkflowRequest.CreatePayload>(json);
		workflowpayloads.push(payload);
	}

	await authenticateAgent();

	for (const workflow of workflowpayloads) {
		await agent.post('/rest/workflows', workflow);
	}
}
