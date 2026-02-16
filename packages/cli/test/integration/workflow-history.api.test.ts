import { LicenseState } from '@n8n/backend-common';
import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import type { User, WorkflowHistory } from '@n8n/db';
import { Container } from '@n8n/di';
import { createOwner, createUser } from '@test-integration/db/users';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import { createWorkflowPublishHistoryItem } from '@test-integration/db/workflow-publish-history';
import type { IConnections, INode } from 'n8n-workflow';

import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

import { ProjectService } from '@/services/project.service.ee';

let owner: User;
let authOwnerAgent: SuperAgentTest;
let member: User;
let authMemberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['workflowHistory'],
});

beforeAll(async () => {
	// Mock license to allow team projects
	const licenseMock = mockInstance(LicenseState);
	licenseMock.isSharingLicensed.mockReturnValue(true);
	licenseMock.getMaxTeamProjects.mockReturnValue(-1);

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

		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[0];

		const expected = {
			versionId: last.versionId,
			workflowId: last.workflowId,
			authors: last.authors,
			name: last.name,
			description: last.description,
			createdAt: last.createdAt.toISOString(),
			updatedAt: last.updatedAt.toISOString(),
			workflowPublishHistory: last.workflowPublishHistory,
		};

		const resp = await authOwnerAgent.get('/workflow-history/workflow/' + workflow.id);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toHaveLength(10);
		expect(resp.body.data[0]).toEqual(expected);
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

		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[0];

		const expected = {
			versionId: last.versionId,
			workflowId: last.workflowId,
			authors: last.authors,
			name: last.name,
			description: last.description,
			createdAt: last.createdAt.toISOString(),
			updatedAt: last.updatedAt.toISOString(),
			workflowPublishHistory: last.workflowPublishHistory,
		};

		const resp = await authOwnerAgent.get('/workflow-history/workflow/' + workflow.id);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toHaveLength(10);
		expect(resp.body.data[0]).toEqual(expected);
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

		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[0];

		const expected = {
			versionId: last.versionId,
			workflowId: last.workflowId,
			authors: last.authors,
			name: last.name,
			description: last.description,
			createdAt: last.createdAt.toISOString(),
			updatedAt: last.updatedAt.toISOString(),
			workflowPublishHistory: last.workflowPublishHistory,
		};

		const resp = await authOwnerAgent.get(`/workflow-history/workflow/${workflow.id}?take=5`);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toHaveLength(5);
		expect(resp.body.data[0]).toEqual(expected);
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

		const last = versions.sort((a, b) => b.createdAt.valueOf() - a.createdAt.valueOf())[5];

		const expected = {
			versionId: last.versionId,
			workflowId: last.workflowId,
			authors: last.authors,
			name: last.name,
			description: last.description,
			createdAt: last.createdAt.toISOString(),
			updatedAt: last.updatedAt.toISOString(),
			workflowPublishHistory: last.workflowPublishHistory,
		};

		const resp = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}?skip=5&take=20`,
		);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toHaveLength(5);
		expect(resp.body.data[0]).toEqual(expected);
	});

	test('should include workflowPublishHistory records related to each history item', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const v1 = await createWorkflowHistoryItem(workflow.id);
		const v2 = await createWorkflowHistoryItem(workflow.id);

		const wph1 = await createWorkflowPublishHistoryItem(v1);
		const wph2 = await createWorkflowPublishHistoryItem(v1, { event: 'deactivated' });
		const wph3 = await createWorkflowPublishHistoryItem(v2);

		const response = await authOwnerAgent.get(`/workflow-history/workflow/${workflow.id}`);
		expect(response.status).toBe(200);

		const body = response.body as { data: WorkflowHistory[] };

		expect(body.data).toHaveLength(2);

		const publishHistories = body.data.map((history) => history.workflowPublishHistory);
		expect(publishHistories).toEqual(
			expect.arrayContaining([expect.any(Array), expect.any(Array)]),
		);

		const publishHistory1 = publishHistories.find((ph) => ph.length === 1)!;
		const publishHistory2 = publishHistories.find((ph) => ph.length === 2)!;

		expect(publishHistory1).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					...wph3,
					createdAt: wph3.createdAt.toISOString(),
				}),
			]),
		);

		expect(publishHistory2).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					...wph1,
					createdAt: wph1.createdAt.toISOString(),
				}),
				expect.objectContaining({
					...wph2,
					createdAt: wph2.createdAt.toISOString(),
				}),
			]),
		);
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

describe('PATCH /workflow-history/workflow/:workflowId/versions/:versionId', () => {
	beforeEach(() => {
		testServer.license.enable('feat:namedVersions');
	});

	test('should return 403 when license is disabled', async () => {
		testServer.license.disable('feat:namedVersions');

		const workflow = await createWorkflow(undefined, owner);
		const version = await createWorkflowHistoryItem(workflow.id);
		const response = await authOwnerAgent
			.patch(`/workflow-history/workflow/${workflow.id}/versions/${version.versionId}`)
			.send({ name: 'Updated Name' });
		expect(response.status).toBe(403);
	});

	test('should return 404 on invalid workflow ID', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const version = await createWorkflowHistoryItem(workflow.id);
		const response = await authOwnerAgent
			.patch(`/workflow-history/workflow/badid/versions/${version.versionId}`)
			.send({ name: 'Updated Name' });
		expect(response.status).toBe(404);
	});

	test('should return 404 on invalid version ID', async () => {
		const workflow = await createWorkflow(undefined, owner);
		await createWorkflowHistoryItem(workflow.id);
		const response = await authOwnerAgent
			.patch(`/workflow-history/workflow/${workflow.id}/versions/badid`)
			.send({ name: 'Updated Name' });
		expect(response.status).toBe(404);
	});

	test('should return 404 if not shared with user', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const version = await createWorkflowHistoryItem(workflow.id);
		const response = await authMemberAgent
			.patch(`/workflow-history/workflow/${workflow.id}/versions/${version.versionId}`)
			.send({ name: 'Updated Name' });
		expect(response.status).toBe(404);
	});

	test('should return 404 if user does not have update permissions', async () => {
		const projectService = Container.get(ProjectService);
		const teamProject = await projectService.createTeamProject(owner, { name: 'Test Project' });
		await projectService.addUser(teamProject.id, {
			userId: member.id,
			role: 'project:viewer',
		});

		const workflow = await createWorkflow(undefined, teamProject);
		const version = await createWorkflowHistoryItem(workflow.id);

		const response = await authMemberAgent
			.patch(`/workflow-history/workflow/${workflow.id}/versions/${version.versionId}`)
			.send({ name: 'Updated Name' });

		expect(response.status).toBe(404);
	});

	test('should update name', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const version = await createWorkflowHistoryItem(workflow.id, { name: 'Original Name' });
		const response = await authOwnerAgent
			.patch(`/workflow-history/workflow/${workflow.id}/versions/${version.versionId}`)
			.send({ name: 'Updated Name' });
		expect(response.status).toBe(200);

		const getResponse = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}/version/${version.versionId}`,
		);
		expect(getResponse.body.data.name).toBe('Updated Name');
	});

	test('should update description', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const version = await createWorkflowHistoryItem(workflow.id, {
			description: 'Original Description',
		});
		const response = await authOwnerAgent
			.patch(`/workflow-history/workflow/${workflow.id}/versions/${version.versionId}`)
			.send({ description: 'Updated Description' });
		expect(response.status).toBe(200);

		const getResponse = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}/version/${version.versionId}`,
		);
		expect(getResponse.body.data.description).toBe('Updated Description');
	});

	test('should update both name and description', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const version = await createWorkflowHistoryItem(workflow.id, {
			name: 'Original Name',
			description: 'Original Description',
		});
		const response = await authOwnerAgent
			.patch(`/workflow-history/workflow/${workflow.id}/versions/${version.versionId}`)
			.send({ name: 'Updated Name', description: 'Updated Description' });
		expect(response.status).toBe(200);

		const getResponse = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}/version/${version.versionId}`,
		);
		expect(getResponse.body.data.name).toBe('Updated Name');
		expect(getResponse.body.data.description).toBe('Updated Description');
	});

	test('should allow setting description to null', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const version = await createWorkflowHistoryItem(workflow.id, {
			description: 'Original Description',
		});
		const resp = await authOwnerAgent
			.patch(`/workflow-history/workflow/${workflow.id}/versions/${version.versionId}`)
			.send({ description: null });
		expect(resp.status).toBe(200);

		const getResponse = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}/version/${version.versionId}`,
		);
		expect(getResponse.body.data.description).toBe(null);
	});

	test('should not modify other fields', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const version = await createWorkflowHistoryItem(workflow.id, {
			name: 'Original Name',
			description: 'Original Description',
			authors: 'John Doe',
		});
		const originalVersionId = version.versionId;
		const originalCreatedAt = version.createdAt;
		const originalAuthors = version.authors;

		const response = await authOwnerAgent
			.patch(`/workflow-history/workflow/${workflow.id}/versions/${version.versionId}`)
			.send({ name: 'Updated Name' });
		expect(response.status).toBe(200);

		// Verify other fields remain unchanged
		const getResponse = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}/version/${version.versionId}`,
		);
		expect(getResponse.body.data.versionId).toBe(originalVersionId);
		expect(getResponse.body.data.authors).toBe(originalAuthors);
		expect(getResponse.body.data.description).toBe('Original Description');
		expect(getResponse.body.data.createdAt).toBe(originalCreatedAt.toISOString());
	});

	test('should ignore immutable fields', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const originalNodes: INode[] = [
			{
				id: 'node1',
				name: 'Original Node',
				parameters: {},
				position: [0, 0],
				type: 'n8n-nodes-base.test',
				typeVersion: 1,
			},
		];
		const originalConnections: IConnections = { node1: {} };
		const originalAuthors = 'John Doe';
		const version = await createWorkflowHistoryItem(workflow.id, {
			name: 'Original Name',
			authors: originalAuthors,
			nodes: originalNodes,
			connections: originalConnections,
		});

		const response = await authOwnerAgent
			.patch(`/workflow-history/workflow/${workflow.id}/versions/${version.versionId}`)
			.send({
				name: 'Updated Name',
				authors: 'Malicious Actor',
				nodes: [{ id: 'fake', name: 'Fake Node' }],
				connections: { fake: {} },
			});
		expect(response.status).toBe(200);

		const getResponse = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}/version/${version.versionId}`,
		);
		expect(getResponse.body.data.name).toBe('Updated Name');
		expect(getResponse.body.data.authors).toBe(originalAuthors);
		expect(getResponse.body.data.nodes).toEqual(originalNodes);
		expect(getResponse.body.data.connections).toEqual(originalConnections);
	});
});
