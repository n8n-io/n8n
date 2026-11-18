import type { WorkflowTestRunEvent } from '@n8n/api-types';
import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { User, WorkflowEntity } from '@n8n/db';
import { Container } from '@n8n/di';
import path from 'node:path';

import { Push } from '@/push';
import { createMember, createOwner } from '@test-integration/db/users';
import { setupTestServer } from '@test-integration/utils';

import { WorkflowTestsConfig } from '../workflow-tests.config';

const server = setupTestServer({
	endpointGroups: ['workflows'],
	modules: ['workflow-tests', 'n8n-packages'],
});

let owner: User;
let workflow: WorkflowEntity;

beforeAll(async () => {
	Container.get(WorkflowTestsConfig).packageDir = path.resolve(
		__dirname,
		'../../../../../@n8n/test',
	);
	owner = await createOwner();
	workflow = await createWorkflow(
		{
			nodes: [
				{
					id: 'start',
					name: 'Start',
					type: 'n8n-nodes-base.manualTrigger',
					typeVersion: 1,
					position: [0, 0],
					parameters: {},
				},
				{
					id: 'done',
					name: 'Done',
					type: 'n8n-nodes-base.noOp',
					typeVersion: 1,
					position: [200, 0],
					parameters: {},
				},
			],
			connections: { Start: { main: [[{ node: 'Done', type: 'main', index: 0 }]] } },
		},
		owner,
	);
});

afterAll(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow']);
});

function eventsOf(runId: string): WorkflowTestRunEvent[] {
	return vi
		.mocked(Container.get(Push).sendToUsers)
		.mock.calls.flatMap(([message, userIds]) =>
			message.type === 'workflowTestRunEvent' &&
			message.data.runId === runId &&
			userIds.includes(owner.id)
				? [message.data.event]
				: [],
		);
}

async function runTests(body: object) {
	const response = await server
		.authAgentFor(owner)
		.post(`/workflows/${workflow.id}/tests/run`)
		.send(body)
		.expect(200);
	const { runId } = response.body.data as { runId: string };
	await vi.waitFor(() => expect(eventsOf(runId).at(-1)?.type).toBe('runFinished'), {
		timeout: 60_000,
		interval: 200,
	});
	return eventsOf(runId);
}

test('runs the test file against the exported workflow and sends each result', async () => {
	const source = `
import { expect, test } from 'vitest';
import nock from 'nock';
import { executeWorkflow, loadPackage } from '@n8n/test';

test('passes the input through', async () => {
	expect(nock.isActive()).toBe(true);
	const workflows = await loadPackage('./package');
	const result = await executeWorkflow(workflows.get('${workflow.id}'), { input: { greeting: 'hi' } });
	expect(result.output).toEqual([{ greeting: 'hi' }]);
});

test('finds no missing node', async () => {
	const workflows = await loadPackage('./package');
	workflows.get('${workflow.id}').node('Missing');
});
`;

	const events = await runTests({ source });

	expect(events).toEqual([
		{ type: 'runStarted' },
		{ type: 'testStarted', name: 'passes the input through' },
		expect.objectContaining({
			type: 'testFinished',
			name: 'passes the input through',
			status: 'passed',
		}),
		{ type: 'testStarted', name: 'finds no missing node' },
		expect.objectContaining({
			type: 'testFinished',
			name: 'finds no missing node',
			status: 'failed',
			error: expect.objectContaining({ code: 'NODE_NOT_FOUND', node: 'Missing' }),
		}),
		{ type: 'runFinished', status: 'failed', errors: [] },
	]);
}, 90_000);

test('sends a run error when the workflow has no published version', async () => {
	const events = await runTests({ source: 'export {}', version: 'published' });

	expect(events).toEqual([
		{
			type: 'runFinished',
			status: 'error',
			errors: [expect.stringContaining('no published version')],
		},
	]);
});

test('refuses a member, even on their own workflow', async () => {
	const member = await createMember();
	const memberWorkflow = await createWorkflow({}, member);

	await server
		.authAgentFor(member)
		.post(`/workflows/${memberWorkflow.id}/tests/run`)
		.send({ source: 'export {}' })
		.expect(403);
});
