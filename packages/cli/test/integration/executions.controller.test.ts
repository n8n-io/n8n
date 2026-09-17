import {
	createTeamProject,
	linkUserToProject,
	createWorkflow,
	shareWorkflowWithUsers,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ExecutionSnapshot, StepDetail } from '@n8n/engine';
import { parse } from 'flatted';
import type { INode } from 'n8n-workflow';
import { MANUAL_TRIGGER_NODE_TYPE } from 'n8n-workflow';

import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { WaitTracker } from '@/wait-tracker';

import {
	createExecution,
	createSuccessfulExecution,
	createWaitingExecution,
	getAllExecutions,
} from './shared/db/executions';
import { createMember, createOwner } from './shared/db/users';
import { setupTestServer } from './shared/utils';

mockInstance(WaitTracker);
mockInstance(ConcurrencyControlService, {
	// @ts-expect-error Private property
	isEnabled: false,
});

const testServer = setupTestServer({ endpointGroups: ['executions'] });

let owner: User;
let member: User;

const saveExecution = async ({ belongingTo }: { belongingTo: User }) => {
	const workflow = await createWorkflow({}, belongingTo);
	return await createSuccessfulExecution(workflow);
};

const saveWaitingExecution = async ({ belongingTo }: { belongingTo: User }) => {
	const workflow = await createWorkflow({}, belongingTo);
	return await createWaitingExecution(workflow);
};

beforeEach(async () => {
	await testDb.truncate(['ExecutionEntity', 'WorkflowEntity', 'SharedWorkflow']);
	testServer.license.reset();
	owner = await createOwner();
	member = await createMember();
});

describe('GET /executions', () => {
	test('returns executions of workflows shared with the user regardless of sharing license', async () => {
		const workflow = await createWorkflow({}, owner);
		await shareWorkflowWithUsers(workflow, [member]);
		await createSuccessfulExecution(workflow);

		const responseWithoutLicense = await testServer
			.authAgentFor(member)
			.get('/executions')
			.expect(200);
		expect(responseWithoutLicense.body.data.count).toBe(1);

		testServer.license.enable('feat:sharing');

		const responseWithLicense = await testServer
			.authAgentFor(member)
			.get('/executions')
			.expect(200);
		expect(responseWithLicense.body.data.count).toBe(1);
	});

	test('project admins can list executions of project workflows without the sharing license', async () => {
		const teamProject = await createTeamProject();
		await linkUserToProject(member, teamProject, 'project:admin');

		const workflow = await createWorkflow({}, teamProject);
		await createSuccessfulExecution(workflow);

		const response = await testServer.authAgentFor(member).get('/executions').expect(200);

		expect(response.body.data.count).toBe(1);
	});

	test('should return a scopes array for each execution', async () => {
		testServer.license.enable('feat:sharing');
		const workflow = await createWorkflow({}, owner);
		await shareWorkflowWithUsers(workflow, [member]);
		await createSuccessfulExecution(workflow);

		const response = await testServer.authAgentFor(member).get('/executions').expect(200);
		expect(response.body.data.results[0].scopes).toContain('workflow:execute');
	});

	describe('paging without a status filter', () => {
		/** 2 running plus `completed` successful executions, newest id last. */
		const seed = async (completed: number) => {
			const workflow = await createWorkflow({}, owner);
			await createExecution({ status: 'running', stoppedAt: undefined }, workflow);
			await createExecution({ status: 'running', stoppedAt: undefined }, workflow);
			for (let i = 0; i < completed; i++) {
				await createExecution({ status: 'success' }, workflow);
			}
		};

		test('reports the current block once and counts only completed rows', async () => {
			await seed(5);

			const response = await testServer
				.authAgentFor(owner)
				.get('/executions')
				.query({ limit: 2 })
				.expect(200);

			const { results, count, nextCursor } = response.body.data;
			expect(results.filter((r: { status: string }) => r.status === 'running')).toHaveLength(2);
			// The count excludes the current block, so paging is over completed rows only.
			expect(count).toBe(5);
			expect(nextCursor).not.toBeNull();
		});

		test('keeps running executions out of later pages', async () => {
			await seed(5);

			const first = await testServer
				.authAgentFor(owner)
				.get('/executions')
				.query({ limit: 2 })
				.expect(200);

			const second = await testServer
				.authAgentFor(owner)
				.get('/executions')
				.query({ limit: 2, cursor: first.body.data.nextCursor })
				.expect(200);

			expect(second.body.data.results).toHaveLength(2);
			expect(second.body.data.results.map((r: { status: string }) => r.status)).toEqual([
				'success',
				'success',
			]);
			expect(second.body.data.count).toBe(5);
		});

		test('walks every completed row exactly once', async () => {
			await seed(5);

			const seen: string[] = [];
			let cursor: string | null = null;
			// 5 rows at 2 per page needs 3 requests. A cursor that fails to advance
			// would page forever, so cap the walk and assert on the cap.
			let requests = 0;

			do {
				const response = await testServer
					.authAgentFor(owner)
					.get('/executions')
					.query({ limit: 2, ...(cursor ? { cursor } : {}) })
					.expect(200);

				const data = response.body.data as {
					results: Array<{ id: string; status: string }>;
					nextCursor: string | null;
				};
				seen.push(...data.results.filter((r) => r.status === 'success').map((r) => r.id));
				cursor = data.nextCursor;
			} while (cursor && ++requests < 5);

			expect(requests).toBeLessThan(4);
			expect(seen).toHaveLength(5);
			expect(new Set(seen).size).toBe(5);
		});
	});
});

describe('GET /executions/:id', () => {
	test('project viewers can view executions for workflows in the project', async () => {
		const teamProject = await createTeamProject();
		await linkUserToProject(member, teamProject, 'project:viewer');

		const workflow = await createWorkflow({}, teamProject);
		const execution = await createSuccessfulExecution(workflow);

		const response = await testServer.authAgentFor(member).get(`/executions/${execution.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeDefined();
	});

	test('project admins can view executions for workflows in the project without the sharing license', async () => {
		const teamProject = await createTeamProject();
		await linkUserToProject(member, teamProject, 'project:admin');

		const workflow = await createWorkflow({}, teamProject);
		const execution = await createSuccessfulExecution(workflow);

		const response = await testServer.authAgentFor(member).get(`/executions/${execution.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data).toBeDefined();
	});

	test('returns executions of workflows shared with the user without the sharing license', async () => {
		const workflow = await createWorkflow({}, owner);
		await shareWorkflowWithUsers(workflow, [member]);
		const execution = await createSuccessfulExecution(workflow);

		const response = await testServer
			.authAgentFor(member)
			.get(`/executions/${execution.id}`)
			.expect(200);

		expect(response.body.data.id).toBe(execution.id);
	});

	test('rejects an id that is neither a positive integer nor a uuid', async () => {
		await testServer.authAgentFor(owner).get('/executions/not-an-id').expect(400);
	});

	describe('engine 2.0 executions', () => {
		const V2_EXECUTION_ID = '01a038ae-c4a8-7799-8a3e-e3c2ca055cfa';
		const startExecution = vi.fn();
		const getExecution = vi.fn();

		beforeAll(() => {
			Container.get(EngineDataPlaneProxyService).registerProvider({
				startExecution,
				getExecution,
				searchExecutions: vi.fn().mockResolvedValue({ items: [], nextCursor: null, total: 0 }),
			});
		});

		beforeEach(() => {
			getExecution.mockReset();
		});

		/** The workflow as the data plane stored it when the run started. */
		const ranWorkflow = (workflowId: string) => ({
			id: workflowId,
			name: 'As it ran',
			nodes: [{ name: 'Trigger', type: 'n8n-nodes-base.manualTrigger' }],
			connections: {},
			settings: {},
			nodeGroups: [],
		});

		const snapshot = (workflowId: string, steps?: StepDetail[]): ExecutionSnapshot => ({
			id: V2_EXECUTION_ID,
			workflowId,
			status: 'completed',
			mode: 'manual',
			graph: { nodes: [{ id: 'trigger-id', name: 'Trigger', type: 'trigger' }], edges: [] },
			workflow: ranWorkflow(workflowId),
			createdAt: '2026-08-25T10:00:00.000Z',
			updatedAt: '2026-08-25T10:00:05.000Z',
			finishedAt: '2026-08-25T10:00:05.000Z',
			steps,
		});

		test('serves a uuid id from the data plane', async () => {
			const workflow = await createWorkflow({}, owner);
			getExecution.mockResolvedValue(snapshot(workflow.id));

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${V2_EXECUTION_ID}`)
				.expect(200);

			expect(getExecution).toHaveBeenCalledWith(V2_EXECUTION_ID, { includeSteps: true });
			expect(response.body.data).toMatchObject({
				id: V2_EXECUTION_ID,
				workflowId: workflow.id,
				status: 'success',
				mode: 'manual',
				finished: true,
			});
			// Redaction reads the policy off the workflow.
			expect(response.body.data.workflowData.id).toBe(workflow.id);
		});

		test('reports the workflow that ran after the live one is edited', async () => {
			const liveNode = (name: string): INode => ({
				id: 'trigger-id',
				name,
				type: MANUAL_TRIGGER_NODE_TYPE,
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			});
			const workflow = await createWorkflow({ nodes: [liveNode('Trigger')] }, owner);
			getExecution.mockResolvedValue(snapshot(workflow.id));

			// Rename the workflow and its node, the way a user would after the run.
			await Container.get(WorkflowRepository).update(workflow.id, {
				name: 'Renamed since',
				nodes: [liveNode('Renamed Trigger')],
			});

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${V2_EXECUTION_ID}`)
				.expect(200);

			expect(response.body.data.workflowData.name).toBe('As it ran');
			expect(response.body.data.workflowData.nodes).toEqual([
				{ name: 'Trigger', type: MANUAL_TRIGGER_NODE_TYPE },
			]);
		});

		test('serves the step outputs as v1 run data', async () => {
			const workflow = await createWorkflow({}, owner);
			getExecution.mockResolvedValue(
				snapshot(workflow.id, [
					{
						id: 'step-1',
						nodeId: 'trigger-id',
						iteration: 0,
						status: 'completed',
						outputs: [[{ json: { hello: 'world' } }]],
						error: null,
						createdAt: '2026-08-25T10:00:00.000Z',
						updatedAt: '2026-08-25T10:00:00.250Z',
					},
				]),
			);

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${V2_EXECUTION_ID}`)
				.expect(200);

			// `data` goes out flatted, the same as a v1 execution's.
			const data = parse(response.body.data.data);
			expect(data.resultData.runData.Trigger[0]).toMatchObject({
				executionStatus: 'success',
				executionTime: 250,
				data: { main: [[{ json: { hello: 'world' } }]] },
			});
			expect(data.resultData.lastNodeExecuted).toBe('Trigger');
		});

		test('does not serve an execution whose workflow the caller cannot read', async () => {
			const workflow = await createWorkflow({}, owner);
			// Give the member a workflow, so the request reaches the reader.
			await createWorkflow({}, member);
			getExecution.mockResolvedValue(snapshot(workflow.id));

			const response = await testServer
				.authAgentFor(member)
				.get(`/executions/${V2_EXECUTION_ID}`)
				.expect(200);

			expect(response.body.data).toBeUndefined();
		});

		test('reports a uuid the data plane does not know the way a missing v1 id is reported', async () => {
			await createWorkflow({}, owner);
			getExecution.mockResolvedValue(undefined);

			const v2 = await testServer
				.authAgentFor(owner)
				.get(`/executions/${V2_EXECUTION_ID}`)
				.expect(200);
			const v1 = await testServer.authAgentFor(owner).get('/executions/999999').expect(200);

			expect(getExecution).toHaveBeenCalledWith(V2_EXECUTION_ID, { includeSteps: true });
			// The id was understood; there is just nothing behind it.
			expect(v2.body).toEqual(v1.body);
		});
	});
});

describe('PATCH /executions/:id', () => {
	test('rejects an id that is neither a positive integer nor a uuid', async () => {
		await testServer
			.authAgentFor(owner)
			.patch('/executions/not-an-id')
			.send({ vote: 'up' })
			.expect(400);
	});

	test('reports annotating an engine 2.0 execution as not implemented', async () => {
		await createWorkflow({}, owner);

		await testServer
			.authAgentFor(owner)
			.patch('/executions/01a038ae-c4a8-7799-8a3e-e3c2ca055cfa')
			.send({ vote: 'up' })
			.expect(501);
	});

	test('reports an engine 2.0 execution as not found when no workflow is accessible', async () => {
		await testServer
			.authAgentFor(member)
			.patch('/executions/01a038ae-c4a8-7799-8a3e-e3c2ca055cfa')
			.send({ vote: 'up' })
			.expect(404);
	});
});

describe('POST /executions/delete', () => {
	test('should hard-delete an execution', async () => {
		await saveExecution({ belongingTo: owner });

		const response = await testServer.authAgentFor(owner).get('/executions').expect(200);

		expect(response.body.data.count).toBe(1);

		const [execution] = response.body.data.results;

		await testServer
			.authAgentFor(owner)
			.post('/executions/delete')
			.send({ ids: [execution.id] })
			.expect(200);

		const executions = await getAllExecutions();

		expect(executions).toHaveLength(0);
	});

	test('should hard-delete executions older than `deleteBefore`', async () => {
		await saveExecution({ belongingTo: owner });

		await testServer
			.authAgentFor(owner)
			.post('/executions/delete')
			.send({ deleteBefore: new Date(Date.now() + 60_000).toISOString() })
			.expect(200);

		const executions = await getAllExecutions();

		expect(executions).toHaveLength(0);
	});

	test('should reject an unparseable `deleteBefore`', async () => {
		await saveExecution({ belongingTo: owner });

		await testServer
			.authAgentFor(owner)
			.post('/executions/delete')
			.send({ deleteBefore: 'not-a-date' })
			.expect(400);

		const executions = await getAllExecutions();

		expect(executions).toHaveLength(1);
	});
});

describe('POST /executions/stop', () => {
	test('should not stop an execution we do not have access to', async () => {
		await saveExecution({ belongingTo: owner });
		const incorrectExecutionId = '1234';

		await testServer
			.authAgentFor(owner)
			.post(`/executions/${incorrectExecutionId}/stop`)
			.expect(400);
	});

	test('should stop an execution we have access to', async () => {
		const execution = await saveWaitingExecution({ belongingTo: owner });

		await testServer.authAgentFor(owner).post(`/executions/${execution.id}/stop`).expect(200);
	});
});
describe('POST /executions/stopMany', () => {
	test('should not stop an execution we do not have access to', async () => {
		await saveWaitingExecution({ belongingTo: owner });

		const result = await testServer
			.authAgentFor(member)
			.post('/executions/stopMany')
			.send({ filter: { status: ['waiting'] } })
			.expect(200);

		expect(result.body.data.stopped).toBe(0);
	});

	test('should stop an execution we have access to', async () => {
		await saveWaitingExecution({ belongingTo: owner });

		const result = await testServer
			.authAgentFor(owner)
			.post('/executions/stopMany')
			.send({ filter: { status: ['waiting'] } })
			.expect(200);

		expect(result.body.data.stopped).toBe(1);
	});
});
