import type { WorkflowTestFile, WorkflowTestRunEvent } from '@n8n/api-types';
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
let member: User;
let workflow: WorkflowEntity;

const passingSource = (workflowId: string) => `
import { expect, test } from 'vitest';
import { executeWorkflow, loadPackage } from '@n8n/test';

test('passes the input through', async () => {
	const workflows = await loadPackage('./package');
	const result = await executeWorkflow(workflows.get('${workflowId}'), { input: { greeting: 'hi' } });
	expect(result.output).toEqual([{ greeting: 'hi' }]);
});
`;

beforeAll(async () => {
	Container.get(WorkflowTestsConfig).packageDir = path.resolve(
		__dirname,
		'../../../../../@n8n/test',
	);
	owner = await createOwner();
	member = await createMember();
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

async function listFiles() {
	const response = await server
		.authAgentFor(owner)
		.get(`/workflows/${workflow.id}/tests`)
		.expect(200);
	return response.body.data as WorkflowTestFile[];
}

test('stores one test file for each workflow', async () => {
	expect(await listFiles()).toEqual([]);

	const created = await server
		.authAgentFor(owner)
		.put(`/workflows/${workflow.id}/tests`)
		.send({ source: 'export {}' })
		.expect(200);
	const file = created.body.data as WorkflowTestFile;
	expect(file).toMatchObject({ workflowId: workflow.id, source: 'export {}', lastRun: null });

	await server
		.authAgentFor(owner)
		.put(`/workflows/${workflow.id}/tests`)
		.send({ source: passingSource(workflow.id) })
		.expect(200);

	const files = await listFiles();
	expect(files).toHaveLength(1);
	expect(files[0]).toMatchObject({ id: file.id, source: passingSource(workflow.id) });
});

test('refuses a user without access to the workflow', async () => {
	const [file] = await listFiles();
	await server.authAgentFor(member).get(`/workflows/${workflow.id}/tests`).expect(403);
	await server
		.authAgentFor(member)
		.put(`/workflows/${workflow.id}/tests`)
		.send({ source: 'export {}' })
		.expect(403);
	await server
		.authAgentFor(member)
		.post(`/workflows/${workflow.id}/tests/${file.id}/run`)
		.send({})
		.expect(403);
});

test('runs the stored file, sends each event, and stores the result as the last run', async () => {
	const [file] = await listFiles();

	const response = await server
		.authAgentFor(owner)
		.post(`/workflows/${workflow.id}/tests/${file.id}/run`)
		.send({})
		.expect(200);
	const { runId } = response.body.data as { runId: string };

	await vi.waitFor(async () => expect((await listFiles())[0].lastRun?.runId).toBe(runId), {
		timeout: 60_000,
		interval: 500,
	});

	expect(eventsOf(runId).at(-1)).toEqual({ type: 'runFinished', status: 'passed', errors: [] });
	expect((await listFiles())[0].lastRun).toMatchObject({
		runId,
		status: 'passed',
		errors: [],
		tests: [expect.objectContaining({ name: 'passes the input through', status: 'passed' })],
	});

	// A new source invalidates the last run.
	await server
		.authAgentFor(owner)
		.put(`/workflows/${workflow.id}/tests`)
		.send({ source: 'export {}' })
		.expect(200);
	expect((await listFiles())[0].lastRun).toBeNull();
}, 90_000);

test('returns 404 for an unknown test file', async () => {
	await server
		.authAgentFor(owner)
		.post(`/workflows/${workflow.id}/tests/unknown/run`)
		.send({})
		.expect(404);
});
