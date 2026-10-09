import { WORKFLOW_HISTORY_DEFAULT_TAKE } from '@n8n/api-types';
import { LicenseState } from '@n8n/backend-common';
import { createWorkflow, mockInstance, testDb } from '@n8n/backend-test-utils';
import type { User, WorkflowHistory } from '@n8n/db';
import { Container } from '@n8n/di';
import type { IConnections, INode } from 'n8n-workflow';

import { ProjectService } from '@/services/project.service.ee';
import { createOwner, createUser } from '@test-integration/db/users';
import { createWorkflowHistoryItem } from '@test-integration/db/workflow-history';
import {
	createManyWorkflowPublishHistoryItems,
	createWorkflowPublishHistoryItem,
} from '@test-integration/db/workflow-publish-history';

import type { SuperAgentTest } from './shared/types';
import * as utils from './shared/utils/';

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
			autosaved: last.autosaved,
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
			autosaved: last.autosaved,
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
			autosaved: last.autosaved,
			workflowPublishHistory: last.workflowPublishHistory,
		};

		const resp = await authOwnerAgent.get(`/workflow-history/workflow/${workflow.id}?take=5`);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toHaveLength(5);
		expect(resp.body.data[0]).toEqual(expected);
	});

	test('should return all versions when take is zero', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const versions = [];
		for (let i = 0; i < 3; i++) {
			versions.push(await createWorkflowHistoryItem(workflow.id));
		}
		const latest = await createWorkflowPublishHistoryItem(versions[0]);

		const response = await authOwnerAgent
			.get(`/workflow-history/workflow/${workflow.id}`)
			.query({ take: 0 })
			.expect(200);

		const page = response.body.data as WorkflowHistory[];
		expect(page).toHaveLength(versions.length);
		expect(page.map(({ versionId }) => versionId).sort()).toEqual(
			versions.map(({ versionId }) => versionId).sort(),
		);
		for (const version of page) {
			expect(version.workflowPublishHistory).toEqual(
				version.versionId === latest.versionId
					? [{ ...latest, createdAt: latest.createdAt.toISOString() }]
					: [],
			);
		}
	});

	test('should page versions with equal timestamps in ascending version ID order', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const createdAt = new Date('2026-01-01T00:00:00Z');
		const versionIds = Array.from(
			{ length: 5 },
			(_, i) => `00000000-0000-4000-8000-${i.toString().padStart(12, '0')}`,
		);
		for (const versionId of versionIds.toReversed()) {
			await createWorkflowHistoryItem(workflow.id, { versionId, createdAt });
		}

		const returnedIds: string[] = [];
		for (const skip of [0, 2, 4]) {
			const response = await authOwnerAgent
				.get(`/workflow-history/workflow/${workflow.id}`)
				.query({ skip, take: 2 })
				.expect(200);
			const page = response.body.data as WorkflowHistory[];
			expect(page.map(({ versionId }) => versionId)).toEqual(versionIds.slice(skip, skip + 2));
			returnedIds.push(...page.map(({ versionId }) => versionId));
		}

		expect(returnedIds).toEqual(versionIds);
		expect(new Set(returnedIds).size).toBe(versionIds.length);
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
			autosaved: last.autosaved,
			workflowPublishHistory: last.workflowPublishHistory,
		};

		const resp = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}?skip=5&take=20`,
		);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toHaveLength(5);
		expect(resp.body.data[0]).toEqual(expected);
	});

	test('should include only the latest activation of each history item', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const v1 = await createWorkflowHistoryItem(workflow.id);
		const v2 = await createWorkflowHistoryItem(workflow.id);

		await createWorkflowPublishHistoryItem(v1);
		const latestOfV1 = await createWorkflowPublishHistoryItem(v1);
		await createWorkflowPublishHistoryItem(v1, { event: 'deactivated' });
		const latestOfV2 = await createWorkflowPublishHistoryItem(v2);

		const response = await authOwnerAgent.get(`/workflow-history/workflow/${workflow.id}`);
		expect(response.status).toBe(200);

		const body = response.body as { data: WorkflowHistory[] };
		const publishHistoryOf = (versionId: string) =>
			body.data.find((history) => history.versionId === versionId)?.workflowPublishHistory;

		expect(publishHistoryOf(v1.versionId)).toEqual([
			{ ...latestOfV1, createdAt: latestOfV1.createdAt.toISOString() },
		]);
		expect(publishHistoryOf(v2.versionId)).toEqual([
			{ ...latestOfV2, createdAt: latestOfV2.createdAt.toISOString() },
		]);
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
	test('should include only the latest activation of the history item', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const v1 = await createWorkflowHistoryItem(workflow.id);
		const v2 = await createWorkflowHistoryItem(workflow.id);
		await createWorkflowPublishHistoryItem(v1);
		const latest = await createWorkflowPublishHistoryItem(v1);
		await createWorkflowPublishHistoryItem(v1, { event: 'deactivated' });
		await createWorkflowPublishHistoryItem(v2);

		const resp = await authOwnerAgent.get(
			`/workflow-history/workflow/${workflow.id}/version/${v1.versionId}`,
		);
		expect(resp.status).toBe(200);
		expect(resp.body.data).toEqual({
			...v1,
			createdAt: v1.createdAt.toISOString(),
			updatedAt: v1.updatedAt.toISOString(),
			workflowPublishHistory: [{ ...latest, createdAt: latest.createdAt.toISOString() }],
		});
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

describe('GET /workflow-history/workflow/:workflowId/publish-timeline', () => {
	test('should return an empty page when take is zero', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const version = await createWorkflowHistoryItem(workflow.id);
		await createManyWorkflowPublishHistoryItems(version, 5);

		const response = await authOwnerAgent
			.get(`/workflow-history/workflow/${workflow.id}/publish-timeline`)
			.query({ take: 0 })
			.expect(200);

		expect(response.body.data).toEqual([]);
	});

	test('should use the default page size when take is omitted', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const version = await createWorkflowHistoryItem(workflow.id);
		const events = await createManyWorkflowPublishHistoryItems(
			version,
			WORKFLOW_HISTORY_DEFAULT_TAKE + 5,
		);

		const response = await authOwnerAgent
			.get(`/workflow-history/workflow/${workflow.id}/publish-timeline`)
			.expect(200);

		const page = response.body.data as Array<{ id: number }>;
		expect(page).toHaveLength(WORKFLOW_HISTORY_DEFAULT_TAKE);
		expect(page.map(({ id }) => id)).toEqual(
			events
				.slice(-WORKFLOW_HISTORY_DEFAULT_TAKE)
				.toReversed()
				.map(({ id }) => id),
		);
	});

	test('should page events with equal timestamps in descending ID order', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const version = await createWorkflowHistoryItem(workflow.id);
		const createdAt = new Date('2026-01-01T00:00:00Z');
		const events = [];
		for (let i = 0; i < 5; i++) {
			events.push(await createWorkflowPublishHistoryItem(version, { createdAt }));
		}

		const returnedIds: number[] = [];
		for (const skip of [0, 2, 4]) {
			const response = await authOwnerAgent
				.get(`/workflow-history/workflow/${workflow.id}/publish-timeline`)
				.query({ skip, take: 2 })
				.expect(200);
			const page = response.body.data as Array<{ id: number }>;
			returnedIds.push(...page.map(({ id }) => id));
		}

		expect(returnedIds).toEqual(events.toReversed().map(({ id }) => id));
	});

	test('should return one page of events, newest first, with the version name', async () => {
		const workflow = await createWorkflow(undefined, owner);
		const version = await createWorkflowHistoryItem(workflow.id, { name: 'Release 1' });
		const start = new Date('2026-01-01T00:00:00Z').getTime();
		const events = [];
		for (let i = 0; i < 5; i++) {
			events.push(
				await createWorkflowPublishHistoryItem(version, {
					event: i % 2 === 0 ? 'activated' : 'deactivated',
					createdAt: new Date(start + i * 60_000),
				}),
			);
		}

		const response = await authOwnerAgent
			.get(`/workflow-history/workflow/${workflow.id}/publish-timeline`)
			.query({ skip: 1, take: 2 });

		expect(response.status).toBe(200);
		const page = response.body.data as Array<{ id: number; event: string; versionName: string }>;
		expect(page.map(({ id }) => id)).toEqual([events[3].id, events[2].id]);
		expect(page[0]).toMatchObject({ event: 'deactivated', versionName: 'Release 1' });
	});
});
