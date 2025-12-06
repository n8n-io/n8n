import { createWorkflow, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';

import { createOwner, createUser } from './shared/db/users';
import { createWorkflowHistoryItem } from './shared/db/workflow-history';
import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';
import { createWorkflowPublishHistoryItem } from '@test-integration/db/workflow-publish-history';

let owner: User;
let authOwnerAgent: SuperAgentTest;
let member: User;
let authMemberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['workflowHistory'],
});

beforeAll(async () => {
	owner = await createOwner();
	authOwnerAgent = testServer.authAgentFor(owner);
	member = await createUser();
	authMemberAgent = testServer.authAgentFor(member);
});

afterEach(async () => {
	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'WorkflowHistory']);
});

describe('GET /workflow-history/:workflowId', () => {
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
				.map(
					async (_, i) =>
						await createWorkflowHistoryItem(workflow.id, { createdAt: new Date(Date.now() + i) }),
				),
		);

		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[0] as any;
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
				.map(
					async (_, i) =>
						await createWorkflowHistoryItem(workflow.id, { createdAt: new Date(Date.now() + i) }),
				),
		);

		await Promise.all(
			new Array(10).fill(undefined).map(async (_) => await createWorkflowHistoryItem(workflow2.id)),
		);

		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[0] as any;
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
				.map(
					async (_, i) =>
						await createWorkflowHistoryItem(workflow.id, { createdAt: new Date(Date.now() + i) }),
				),
		);

		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[0] as any;
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
				.map(
					async (_, i) =>
						await createWorkflowHistoryItem(workflow.id, { createdAt: new Date(Date.now() + i) }),
				),
		);

		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[5] as any;
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
	test('should include workflowPublishHistory records related to each history item', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const v1 = await createWorkflowHistoryItem(workflow.id);
		const v2 = await createWorkflowHistoryItem(workflow.id);
		const wph1 = await createWorkflowPublishHistoryItem(v1);
		const wph2 = await createWorkflowPublishHistoryItem(v1, { event: 'deactivated' });
		const wph3 = await createWorkflowPublishHistoryItem(v2);

		const resp = await authOwnerAgent.get(`/workflow-history/workflow/${workflow.id}`);

		expect(resp.status).toBe(200);
		expect(resp.body.data[0].workflowPublishHistory).toHaveLength(1);
		expect(resp.body.data[0].workflowPublishHistory).toContainEqual({
			...wph3,
			createdAt: wph3.createdAt.toISOString(),
		});
		expect(resp.body.data[1].workflowPublishHistory).toHaveLength(2);
		expect(resp.body.data[1].workflowPublishHistory).toContainEqual({
			...wph1,
			createdAt: wph1.createdAt.toISOString(),
		});
		expect(resp.body.data[1].workflowPublishHistory).toContainEqual({
			...wph2,
			createdAt: wph2.createdAt.toISOString(),
		});
	});
});

describe('GET /workflow-history/workflow/:workflowId/version/:versionId', () => {
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
	test('should include workflowPublishHistory records related to history item', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const v1 = await createWorkflowHistoryItem(workflow.id);
		const v2 = await createWorkflowHistoryItem(workflow.id);
		const wph1 = await createWorkflowPublishHistoryItem(v1);
		const wph2 = await createWorkflowPublishHistoryItem(v1, { event: 'deactivated' });
		await createWorkflowPublishHistoryItem(v2);

		const resp = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}/version/${v1.versionId}`,
		);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toEqual({
			...v1,
			createdAt: v1.createdAt.toISOString(),
			updatedAt: v1.updatedAt.toISOString(),
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			workflowPublishHistory: expect.arrayContaining([
				{ ...wph1, createdAt: wph1.createdAt.toISOString() },
				{ ...wph2, createdAt: wph2.createdAt.toISOString() },
			]),
		});
		expect(resp.body.data.workflowPublishHistory).toHaveLength(2);
	});
});
