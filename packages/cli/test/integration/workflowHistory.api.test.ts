import type { SuperAgentTest } from 'supertest';
import { License } from '@/License';
import type { User } from '@db/entities/User';

import { mockInstance } from '../shared/mocking';
import * as testDb from './shared/testDb';
import * as utils from './shared/utils/';
import { createOwner, createUser } from './shared/db/users';
import { createWorkflow } from './shared/db/workflows';
import { createWorkflowHistoryItem } from './shared/db/workflowHistory';

let owner: User;
let authOwnerAgent: SuperAgentTest;
let member: User;
let authMemberAgent: SuperAgentTest;

const licenseLike = mockInstance(License, {
	isWorkflowHistoryLicensed: jest.fn().mockReturnValue(true),
	isWithinUsersLimit: jest.fn().mockReturnValue(true),
});

const testServer = utils.setupTestServer({ endpointGroups: ['workflowHistory'] });

beforeAll(async () => {
	owner = await createOwner();
	authOwnerAgent = testServer.authAgentFor(owner);
	member = await createUser();
	authMemberAgent = testServer.authAgentFor(member);
});

beforeEach(() => {
	licenseLike.isWorkflowHistoryLicensed.mockReturnValue(true);
});

afterEach(async () => {
	await testDb.truncate(['Workflow', 'SharedWorkflow', 'WorkflowHistory']);
});

describe('GET /workflow-history/:workflowId', () => {
	test('should not work when license is not available', async () => {
		licenseLike.isWorkflowHistoryLicensed.mockReturnValue(false);
		const resp = await authOwnerAgent.get('/workflow-history/workflow/badid');
		expect(resp.status).toBe(403);
		expect(resp.text).toBe('Workflow History license data not found');
	});

	test('should not return anything on an invalid workflow ID', async () => {
		await createWorkflow(undefined, owner);
		const resp = await authOwnerAgent.get('/workflow-history/workflow/badid');
		expect(resp.status).toBe(404);
	});

	test('should not return anything if not shared with user', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const resp = await authMemberAgent.get('/workflow-history/workflow/' + workflow.id);
		expect(resp.status).toBe(404);
	});

	test('should return any empty list if no versions', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const resp = await authOwnerAgent.get('/workflow-history/workflow/' + workflow.id);
		expect(resp.status).toBe(200);
		expect(resp.body).toEqual({ data: [] });
	});

	test('should return versions for workflow', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const versions = await Promise.all(
			new Array(10)
				.fill(undefined)
				.map(async (_, i) =>
					createWorkflowHistoryItem(workflow.id, { createdAt: new Date(Date.now() + i) }),
				),
		);

		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[0]! as any;
		delete last.nodes;
		delete last.connections;

		last.createdAt = last.createdAt.toISOString();
		last.updatedAt = last.updatedAt.toISOString();

		const resp = await authOwnerAgent.get('/workflow-history/workflow/' + workflow.id);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toHaveLength(10);
		expect(resp.body.data[0]).toEqual(last);
	});

	test('should return versions only for workflow id provided', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const workflow2 = await createWorkflow(undefined, owner);
		const versions = await Promise.all(
			new Array(10)
				.fill(undefined)
				.map(async (_, i) =>
					createWorkflowHistoryItem(workflow.id, { createdAt: new Date(Date.now() + i) }),
				),
		);

		const versions2 = await Promise.all(
			new Array(10).fill(undefined).map(async (_) => createWorkflowHistoryItem(workflow2.id)),
		);

		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[0]! as any;
		delete last.nodes;
		delete last.connections;

		last.createdAt = last.createdAt.toISOString();
		last.updatedAt = last.updatedAt.toISOString();

		const resp = await authOwnerAgent.get('/workflow-history/workflow/' + workflow.id);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toHaveLength(10);
		expect(resp.body.data[0]).toEqual(last);
	});

	test('should work with take parameter', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const versions = await Promise.all(
			new Array(10)
				.fill(undefined)
				.map(async (_, i) =>
					createWorkflowHistoryItem(workflow.id, { createdAt: new Date(Date.now() + i) }),
				),
		);

		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[0]! as any;
		delete last.nodes;
		delete last.connections;

		last.createdAt = last.createdAt.toISOString();
		last.updatedAt = last.updatedAt.toISOString();

		const resp = await authOwnerAgent.get(`/workflow-history/workflow/${workflow.id}?take=5`);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toHaveLength(5);
		expect(resp.body.data[0]).toEqual(last);
	});

	test('should work with skip parameter', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const versions = await Promise.all(
			new Array(10)
				.fill(undefined)
				.map(async (_, i) =>
					createWorkflowHistoryItem(workflow.id, { createdAt: new Date(Date.now() + i) }),
				),
		);

		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[5]! as any;
		delete last.nodes;
		delete last.connections;

		last.createdAt = last.createdAt.toISOString();
		last.updatedAt = last.updatedAt.toISOString();

		const resp = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}?skip=5&take=20`,
		);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toHaveLength(5);
		expect(resp.body.data[0]).toEqual(last);
	});
});

describe('GET /workflow-history/workflow/:workflowId/version/:versionId', () => {
	test('should not work when license is not available', async () => {
		licenseLike.isWorkflowHistoryLicensed.mockReturnValue(false);
		const resp = await authOwnerAgent.get('/workflow-history/workflow/badid/version/badid');
		expect(resp.status).toBe(403);
		expect(resp.text).toBe('Workflow History license data not found');
	});

	test('should not return anything on an invalid workflow ID', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const version = await createWorkflowHistoryItem(workflow.id);
		const resp = await authOwnerAgent.get(
			`/workflow-history/workflow/badid/version/${version.versionId}`,
		);
		expect(resp.status).toBe(404);
	});

	test('should not return anything on an invalid version ID', async () => {
		const workflow = await createWorkflow(undefined, owner);
		await createWorkflowHistoryItem(workflow.id);
		const resp = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}/version/badid`,
		);
		expect(resp.status).toBe(404);
	});

	test('should return version', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const version = await createWorkflowHistoryItem(workflow.id);
		const resp = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}/version/${version.versionId}`,
		);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toEqual({
			...version,
			createdAt: version.createdAt.toISOString(),
			updatedAt: version.updatedAt.toISOString(),
		});
	});

	test('should not return anything if not shared with user', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const version = await createWorkflowHistoryItem(workflow.id);
		const resp = await authMemberAgent.get(
			`/workflow-history/workflow/${workflow.id}/version/${version.versionId}`,
		);
		expect(resp.status).toBe(404);
	});

	test('should not return anything if not shared with user and using workflow owned by unshared user', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const workflowMember = await createWorkflow(undefined, member);
		const version = await createWorkflowHistoryItem(workflow.id);
		const resp = await authMemberAgent.get(
			`/workflow-history/workflow/${workflowMember.id}/version/${version.versionId}`,
		);
		expect(resp.status).toBe(404);
	});
});
