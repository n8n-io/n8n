import {
	createTeamProject,
	linkUserToProject,
	createWorkflow,
	shareWorkflowWithUsers,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { ExecutionSnapshot } from '@n8n/engine';

import { ConcurrencyControlService } from '@/concurrency/concurrency-control.service';
import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { WaitTracker } from '@/wait-tracker';

import {
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
			Container.get(EngineDataPlaneProxyService).registerProvider({ startExecution, getExecution });
		});

		beforeEach(() => {
			getExecution.mockReset();
		});

		const snapshot = (workflowId: string): ExecutionSnapshot => ({
			id: V2_EXECUTION_ID,
			workflowId,
			status: 'completed',
			mode: 'manual',
			graph: { nodes: [], edges: [] },
			createdAt: '2026-08-25T10:00:00.000Z',
			updatedAt: '2026-08-25T10:00:05.000Z',
			finishedAt: '2026-08-25T10:00:05.000Z',
		});

		test('serves a uuid id from the data plane', async () => {
			const workflow = await createWorkflow({}, owner);
			getExecution.mockResolvedValue(snapshot(workflow.id));

			const response = await testServer
				.authAgentFor(owner)
				.get(`/executions/${V2_EXECUTION_ID}`)
				.expect(200);

			expect(getExecution).toHaveBeenCalledWith(V2_EXECUTION_ID);
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

			expect(getExecution).toHaveBeenCalledWith(V2_EXECUTION_ID);
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
