import { EventService, InstanceWriteAccessService } from '@n8n/backend-services';
import {
	createTeamProject,
	createWorkflow,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { IConnections, IDataObject, INode, ITaskData } from 'n8n-workflow';
import { WEBHOOK_NODE_TYPE } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveExecutions } from '@/active-executions';
import { Telemetry } from '@/telemetry';
import { TestWebhookRegistrationsService } from '@/webhooks/test-webhook-registrations.service';
import { TestWebhooks } from '@/webhooks/test-webhooks';

import { getAllExecutions } from '../shared/db/executions';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

mockInstance(Telemetry);

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });

const TRIGGER_NAME = 'When clicking Execute';
const SET_NAME = 'Edit Fields';
const LAST_NAME = 'Edit Fields 2';
const WEBHOOK_NAME = 'Webhook';

const toLastNode = { nodeName: LAST_NAME, mode: 'inclusive' };

let owner: User;
let member: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

const taskData = (json: IDataObject): ITaskData[] => [
	{ startTime: 0, executionTime: 0, executionIndex: 0, source: [], data: { main: [[{ json }]] } },
];

const manualTriggerNode = (): INode => ({
	id: uuid(),
	name: TRIGGER_NAME,
	type: 'n8n-nodes-base.manualTrigger',
	parameters: {},
	typeVersion: 1,
	position: [0, 0],
});

const setNode = (name: string, position: [number, number]): INode => ({
	id: uuid(),
	name,
	type: 'n8n-nodes-base.set',
	parameters: {},
	typeVersion: 3.4,
	position,
});

const linearConnections: IConnections = {
	[TRIGGER_NAME]: { main: [[{ node: SET_NAME, type: 'main', index: 0 }]] },
	[SET_NAME]: { main: [[{ node: LAST_NAME, type: 'main', index: 0 }]] },
};

const createLinearWorkflow = async (userOrProject: User | Project = owner) =>
	await createWorkflow(
		{
			nodes: [manualTriggerNode(), setNode(SET_NAME, [200, 0]), setNode(LAST_NAME, [400, 0])],
			connections: linearConnections,
		},
		userOrProject,
	);

const waitForExecution = async (executionId: string) => {
	const activeExecutions = Container.get(ActiveExecutions);
	if (activeExecutions.has(executionId)) {
		await activeExecutions.getPostExecutePromise(executionId);
	}
};

const executionsOf = async (workflowId: string) =>
	(await getAllExecutions()).filter((execution) => execution.workflowId === workflowId);

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	member = await createMemberWithApiKey();
	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);

	await utils.initNodeTypes();
});

beforeEach(async () => {
	await testDb.truncate([
		'ExecutionEntity',
		'SharedWorkflow',
		'WorkflowEntity',
		'WorkflowHistory',
		'WorkflowPublishHistory',
	]);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe('POST /workflows/:workflowId/run', () => {
	describe('starting an execution', () => {
		test('should start a manual execution from run data', async () => {
			const workflow = await createLinearWorkflow();

			const response = await authOwnerAgent.post(`/workflows/${workflow.id}/run`).send({
				runData: { [TRIGGER_NAME]: taskData({}) },
				destinationNode: toLastNode,
			});

			expect(response.statusCode).toBe(200);
			const { executionId } = response.body;
			expect(executionId).toMatch(/^\d+$/);

			await waitForExecution(executionId);
			expect(await executionsOf(workflow.id)).toEqual([
				expect.objectContaining({ id: executionId, mode: 'manual' }),
			]);
		});

		test('should accept dirty node names', async () => {
			const workflow = await createLinearWorkflow();

			const response = await authOwnerAgent.post(`/workflows/${workflow.id}/run`).send({
				runData: {
					[TRIGGER_NAME]: taskData({}),
					[SET_NAME]: taskData({ stale: true }),
				},
				destinationNode: toLastNode,
				dirtyNodeNames: [SET_NAME],
			});

			expect(response.statusCode).toBe(200);
			await waitForExecution(response.body.executionId);
		});

		test('should reuse run data read from the executions endpoint', async () => {
			const workflow = await createLinearWorkflow();
			const firstRun = await authOwnerAgent.post(`/workflows/${workflow.id}/run`).send({
				runData: { [TRIGGER_NAME]: taskData({ from: 'earlier' }) },
				destinationNode: toLastNode,
			});
			expect(firstRun.statusCode).toBe(200);
			await waitForExecution(firstRun.body.executionId);

			const earlierExecution = await authOwnerAgent.get(
				`/executions/${firstRun.body.executionId}?includeData=true`,
			);
			const reusedRunData = earlierExecution.body.data.resultData.runData;
			const secondRun = await authOwnerAgent
				.post(`/workflows/${workflow.id}/run`)
				.send({ runData: reusedRunData, destinationNode: toLastNode });

			expect(secondRun.statusCode).toBe(200);
			await waitForExecution(secondRun.body.executionId);
			expect(await executionsOf(workflow.id)).toHaveLength(2);
		});

		test('should emit workflow-executed', async () => {
			const workflow = await createLinearWorkflow();
			const emitSpy = vi.spyOn(Container.get(EventService), 'emit');

			const response = await authOwnerAgent.post(`/workflows/${workflow.id}/run`).send({
				runData: { [TRIGGER_NAME]: taskData({}) },
				destinationNode: toLastNode,
			});

			expect(response.statusCode).toBe(200);
			expect(emitSpy).toHaveBeenCalledWith(
				'workflow-executed',
				expect.objectContaining({
					workflowId: workflow.id,
					executionId: response.body.executionId,
					source: 'user-manual',
				}),
			);
			await waitForExecution(response.body.executionId);
		});
	});

	describe('validation', () => {
		test.each([
			{ name: 'a missing runData', body: { destinationNode: toLastNode } },
			{ name: 'a missing destinationNode', body: { runData: {} } },
			{
				name: 'an unknown destination mode',
				body: { runData: {}, destinationNode: { nodeName: LAST_NAME, mode: 'sideways' } },
			},
			{
				name: 'an unknown top-level key',
				body: { runData: {}, destinationNode: toLastNode, workflowData: {} },
			},
		])('should return 400 for $name', async ({ body }) => {
			const workflow = await createLinearWorkflow();

			const response = await authOwnerAgent.post(`/workflows/${workflow.id}/run`).send(body);

			expect(response.statusCode).toBe(400);
			expect(await executionsOf(workflow.id)).toHaveLength(0);
		});

		test('should return 400 when the destination node is not in the workflow', async () => {
			const workflow = await createLinearWorkflow();

			const response = await authOwnerAgent.post(`/workflows/${workflow.id}/run`).send({
				runData: {},
				destinationNode: { nodeName: 'Missing node', mode: 'inclusive' },
			});

			expect(response.statusCode).toBe(400);
			expect(await executionsOf(workflow.id)).toHaveLength(0);
		});
	});

	describe('access', () => {
		test('should return 404 for a workflow that does not exist', async () => {
			const response = await authOwnerAgent.post(`/workflows/${uuid()}/run`).send({
				runData: {},
				destinationNode: toLastNode,
			});

			expect(response.statusCode).toBe(404);
		});

		test("should return 403 for a workflow in another user's personal project", async () => {
			const workflow = await createLinearWorkflow(owner);

			const response = await authMemberAgent.post(`/workflows/${workflow.id}/run`).send({
				runData: {},
				destinationNode: toLastNode,
			});

			expect(response.statusCode).toBe(403);
			expect(await executionsOf(workflow.id)).toHaveLength(0);
		});

		test('should return 403 when the API key lacks workflow:execute', async () => {
			const readOnlyKeyOwner = await createOwnerWithApiKey({ scopes: ['workflow:read'] });
			const workflow = await createLinearWorkflow(readOnlyKeyOwner);

			const response = await testServer
				.publicApiAgentFor(readOnlyKeyOwner)
				.post(`/workflows/${workflow.id}/run`)
				.send({ runData: {}, destinationNode: toLastNode });

			expect(response.statusCode).toBe(403);
			expect(await executionsOf(workflow.id)).toHaveLength(0);
		});

		test('should return 403 for a user who is only a viewer of the project', async () => {
			const teamProject = await createTeamProject(undefined, owner);
			await linkUserToProject(member, teamProject, 'project:viewer');
			const workflow = await createLinearWorkflow(teamProject);

			const response = await authMemberAgent.post(`/workflows/${workflow.id}/run`).send({
				runData: {},
				destinationNode: toLastNode,
			});

			expect(response.statusCode).toBe(403);
			expect(await executionsOf(workflow.id)).toHaveLength(0);
		});

		test('should return 403 on a read-only instance', async () => {
			const workflow = await createLinearWorkflow();
			const instanceWriteAccess = Container.get(InstanceWriteAccessService);
			instanceWriteAccess.setReadOnly(true);

			try {
				const response = await authOwnerAgent.post(`/workflows/${workflow.id}/run`).send({
					runData: {},
					destinationNode: toLastNode,
				});

				expect(response.statusCode).toBe(403);
				expect(await executionsOf(workflow.id)).toHaveLength(0);
			} finally {
				instanceWriteAccess.setReadOnly(false);
			}
		});
	});

	describe('when the run must wait for a trigger event', () => {
		test('should return 409, cancel the test webhook, and start no execution', async () => {
			const webhookId = uuid();
			const webhookWorkflow = await createWorkflow(
				{
					nodes: [
						{
							id: uuid(),
							name: WEBHOOK_NAME,
							type: WEBHOOK_NODE_TYPE,
							typeVersion: 2,
							position: [0, 0],
							webhookId,
							parameters: { httpMethod: 'POST', path: webhookId, options: {} },
						},
						setNode(SET_NAME, [200, 0]),
					],
					connections: {
						[WEBHOOK_NAME]: { main: [[{ node: SET_NAME, type: 'main', index: 0 }]] },
					},
				},
				owner,
			);
			const cancelWebhook = vi.spyOn(Container.get(TestWebhooks), 'cancelWebhook');

			const response = await authOwnerAgent.post(`/workflows/${webhookWorkflow.id}/run`).send({
				runData: {},
				destinationNode: { nodeName: SET_NAME, mode: 'inclusive' },
			});

			expect(response.statusCode).toBe(409);
			expect(cancelWebhook).toHaveBeenCalledWith(webhookWorkflow.id);
			const remainingRegistrations = (
				await Container.get(TestWebhookRegistrationsService).getAllRegistrations()
			).filter((registration) => registration.webhook.workflowId === webhookWorkflow.id);
			expect(remainingRegistrations).toEqual([]);
			expect(await executionsOf(webhookWorkflow.id)).toHaveLength(0);
		});
	});
});
