import {
	createTeamProject,
	createWorkflow,
	createWorkflowWithTriggerAndHistory,
	testDb,
	mockInstance,
	createActiveWorkflow,
	createWorkflowWithHistory,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Project, TagEntity, User, WorkflowHistory } from '@n8n/db';
import {
	WorkflowRepository,
	ProjectRepository,
	WorkflowHistoryRepository,
	SharedWorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { Not } from '@n8n/typeorm';
import { InstanceSettings } from 'n8n-core';
import type { INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { STARTING_NODES } from '@/constants';
import { ExecutionService } from '@/executions/execution.service';
import { ProjectService } from '@/services/project.service.ee';
import { Telemetry } from '@/telemetry';

import { createTag } from '../shared/db/tags';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import { createWorkflowHistoryItem } from '../shared/db/workflow-history';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

mockInstance(Telemetry);

let ownerPersonalProject: Project;
let owner: User;
let member: User;
let memberPersonalProject: Project;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let activeWorkflowManager: ActiveWorkflowManager;
let workflowRepository: WorkflowRepository;

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });
const license = testServer.license;

const globalConfig = Container.get(GlobalConfig);

mockInstance(ExecutionService);

beforeAll(async () => {
	owner = await createOwnerWithApiKey();
	Container.get(InstanceSettings).markAsLeader();
	ownerPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		owner.id,
	);

	member = await createMemberWithApiKey();

	memberPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		member.id,
	);

	await utils.initNodeTypes();

	activeWorkflowManager = Container.get(ActiveWorkflowManager);
	workflowRepository = Container.get(WorkflowRepository);

	await activeWorkflowManager.init();
});

beforeEach(async () => {
	await testDb.truncate([
		'SharedCredentials',
		'SharedWorkflow',
		'TagEntity',
		'WorkflowEntity',
		'CredentialsEntity',
		'WorkflowHistory',
	]);

	authOwnerAgent = testServer.publicApiAgentFor(owner);
	authMemberAgent = testServer.publicApiAgentFor(member);

	globalConfig.tags.disabled = false;
});

afterEach(async () => {
	await activeWorkflowManager?.removeAll();
});

const testWithAPIKey =
	(method: 'get' | 'post' | 'put' | 'delete', url: string, apiKey: string | null) => async () => {
		void authOwnerAgent.set({ 'X-N8N-API-KEY': apiKey });
		const response = await authOwnerAgent[method](url);
		expect(response.statusCode).toBe(401);
	};

describe('GET /workflows', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/workflows', null));

	test('should fail due to invalid API Key', testWithAPIKey('get', '/workflows', 'abcXYZ'));

	test('should return all owned workflows', async () => {
		await Promise.all([
			createWorkflowWithHistory({}, member),
			createWorkflowWithHistory({}, member),
			createWorkflowWithHistory({}, member),
		]);

		const response = await authMemberAgent.get('/workflows');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(3);
		expect(response.body.nextCursor).toBeNull();

		for (const workflow of response.body.data) {
			const {
				id,
				connections,
				active,
				activeVersionId,
				staticData,
				nodes,
				settings,
				name,
				createdAt,
				updatedAt,
				tags,
			} = workflow;

			expect(id).toBeDefined();
			expect(name).toBeDefined();
			expect(connections).toBeDefined();
			expect(active).toBe(false);
			expect(activeVersionId).toBeNull();
			expect(staticData).toBeDefined();
			expect(nodes).toBeDefined();
			expect(tags).toBeDefined();
			expect(settings).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
		}
	});

	test('should return all owned workflows with pagination', async () => {
		await Promise.all([
			createWorkflowWithHistory({}, member),
			createWorkflowWithHistory({}, member),
			createWorkflowWithHistory({}, member),
		]);

		const response = await authMemberAgent.get('/workflows?limit=1');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(1);
		expect(response.body.nextCursor).not.toBeNull();

		const response2 = await authMemberAgent.get(
			`/workflows?limit=1&cursor=${response.body.nextCursor}`,
		);

		expect(response2.statusCode).toBe(200);
		expect(response2.body.data.length).toBe(1);
		expect(response2.body.nextCursor).not.toBeNull();
		expect(response2.body.nextCursor).not.toBe(response.body.nextCursor);

		const responses = [...response.body.data, ...response2.body.data];

		for (const workflow of responses) {
			const {
				id,
				connections,
				active,
				activeVersionId,
				staticData,
				nodes,
				settings,
				name,
				createdAt,
				updatedAt,
				tags,
			} = workflow;

			expect(id).toBeDefined();
			expect(name).toBeDefined();
			expect(connections).toBeDefined();
			expect(active).toBe(false);
			expect(activeVersionId).toBeNull();
			expect(staticData).toBeDefined();
			expect(nodes).toBeDefined();
			expect(tags).toBeDefined();
			expect(settings).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
		}

		// check that we really received a different result
		expect(response.body.data[0].id).not.toEqual(response2.body.data[0].id);
	});

	test('should return all owned workflows filtered by tag', async () => {
		const tag = await createTag({});

		const [workflow] = await Promise.all([
			createWorkflowWithHistory({ tags: [tag] }, member),
			createWorkflowWithHistory({}, member),
		]);

		const response = await authMemberAgent.get(`/workflows?tags=${tag.name}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(1);

		const {
			id,
			connections,
			active,
			activeVersionId,
			staticData,
			nodes,
			settings,
			name,
			createdAt,
			updatedAt,
			tags: wfTags,
		} = response.body.data[0];

		expect(id).toBe(workflow.id);
		expect(name).toBeDefined();
		expect(connections).toBeDefined();
		expect(active).toBe(false);
		expect(activeVersionId).toBeNull();
		expect(staticData).toBeDefined();
		expect(nodes).toBeDefined();
		expect(settings).toBeDefined();
		expect(createdAt).toBeDefined();
		expect(updatedAt).toBeDefined();

		expect(wfTags.length).toBe(1);
		expect(wfTags[0].id).toBe(tag.id);
	});

	test('should return all owned workflows filtered by tags', async () => {
		const tags = await Promise.all([await createTag({}), await createTag({})]);
		const tagNames = tags.map((tag) => tag.name).join(',');

		const [workflow1, workflow2] = await Promise.all([
			createWorkflowWithHistory({ tags }, member),
			createWorkflowWithHistory({ tags }, member),
			createWorkflowWithHistory({}, member),
			createWorkflowWithHistory({ tags: [tags[0]] }, member),
			createWorkflowWithHistory({ tags: [tags[1]] }, member),
		]);

		const response = await authMemberAgent.get(`/workflows?tags=${tagNames}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(2);

		for (const workflow of response.body.data) {
			const {
				id,
				connections,
				active,
				activeVersionId,
				staticData,
				nodes,
				settings,
				name,
				createdAt,
				updatedAt,
			} = workflow;

			expect(id).toBeDefined();
			expect([workflow1.id, workflow2.id].includes(id)).toBe(true);

			expect(name).toBeDefined();
			expect(connections).toBeDefined();
			expect(active).toBe(false);
			expect(activeVersionId).toBeNull();
			expect(staticData).toBeDefined();
			expect(nodes).toBeDefined();
			expect(settings).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();

			expect(workflow.tags.length).toBe(2);
			workflow.tags.forEach((tag: TagEntity) => {
				expect(tags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
			});
		}
	});

	test('for owner, should return all workflows filtered by `projectId`', async () => {
		license.setQuota('quota:maxTeamProjects', -1);
		const firstProject = await Container.get(ProjectService).createTeamProject(owner, {
			name: 'First',
		});
		const secondProject = await Container.get(ProjectService).createTeamProject(member, {
			name: 'Second',
		});

		await Promise.all([
			createWorkflowWithHistory({ name: 'First workflow' }, firstProject),
			createWorkflowWithHistory({ name: 'Second workflow' }, secondProject),
		]);

		const firstResponse = await authOwnerAgent.get(`/workflows?projectId=${firstProject.id}`);
		const secondResponse = await authOwnerAgent.get(`/workflows?projectId=${secondProject.id}`);

		expect(firstResponse.statusCode).toBe(200);
		expect(firstResponse.body.data.length).toBe(1);
		expect(firstResponse.body.data[0].name).toBe('First workflow');

		expect(secondResponse.statusCode).toBe(200);
		expect(secondResponse.body.data.length).toBe(1);
		expect(secondResponse.body.data[0].name).toBe('Second workflow');
	});

	test('for member, should return all member-accessible workflows filtered by `projectId`', async () => {
		license.setQuota('quota:maxTeamProjects', -1);
		const otherProject = await Container.get(ProjectService).createTeamProject(member, {
			name: 'Other project',
		});

		await Promise.all([
			createWorkflowWithHistory({}, member),
			createWorkflowWithHistory({ name: 'Other workflow' }, otherProject),
		]);

		const response = await authMemberAgent.get(`/workflows?projectId=${otherProject.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(1);
		expect(response.body.data[0].name).toBe('Other workflow');
	});

	test('should return all owned workflows filtered by name', async () => {
		const workflowName = 'Workflow 1';

		await Promise.all([
			createWorkflowWithHistory({ name: workflowName }, member),
			createWorkflowWithHistory({}, member),
		]);

		const response = await authMemberAgent.get(`/workflows?name=${workflowName}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(1);

		const {
			id,
			connections,
			active,
			activeVersionId,
			staticData,
			nodes,
			settings,
			name,
			createdAt,
			updatedAt,
			tags,
		} = response.body.data[0];

		expect(id).toBeDefined();
		expect(name).toBe(workflowName);
		expect(connections).toBeDefined();
		expect(active).toBe(false);
		expect(activeVersionId).toBeNull();
		expect(staticData).toBeDefined();
		expect(nodes).toBeDefined();
		expect(settings).toBeDefined();
		expect(createdAt).toBeDefined();
		expect(updatedAt).toBeDefined();
		expect(tags).toEqual([]);
	});

	test('should return all workflows for owner', async () => {
		await Promise.all([
			createWorkflowWithHistory({}, owner),
			createWorkflowWithHistory({}, member),
			createWorkflowWithHistory({}, owner),
			createWorkflowWithHistory({}, member),
			createWorkflowWithHistory({}, owner),
		]);

		const response = await authOwnerAgent.get('/workflows');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(5);
		expect(response.body.nextCursor).toBeNull();

		for (const workflow of response.body.data) {
			const {
				id,
				connections,
				active,
				activeVersionId,
				staticData,
				nodes,
				settings,
				name,
				createdAt,
				updatedAt,
				tags,
			} = workflow;

			expect(id).toBeDefined();
			expect(name).toBeDefined();
			expect(connections).toBeDefined();
			expect(active).toBe(false);
			expect(activeVersionId).toBeNull();
			expect(staticData).toBeDefined();
			expect(nodes).toBeDefined();
			expect(tags).toBeDefined();
			expect(settings).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();
		}
	});

	test('should return all owned workflows without pinned data', async () => {
		await Promise.all([
			createWorkflowWithHistory(
				{
					pinData: {
						Webhook1: [{ json: { first: 'first' } }],
					},
				},
				member,
			),
			createWorkflowWithHistory(
				{
					pinData: {
						Webhook2: [{ json: { second: 'second' } }],
					},
				},
				member,
			),
			createWorkflowWithHistory(
				{
					pinData: {
						Webhook3: [{ json: { third: 'third' } }],
					},
				},
				member,
			),
		]);

		const response = await authMemberAgent.get('/workflows?excludePinnedData=true');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(3);
		expect(response.body.nextCursor).toBeNull();

		for (const workflow of response.body.data) {
			const { pinData } = workflow;

			expect(pinData).not.toBeDefined();
		}
	});

	test('should return activeVersion for all workflows', async () => {
		const inactiveWorkflow = await createWorkflowWithHistory({}, member);
		const activeWorkflow = await createWorkflowWithTriggerAndHistory({}, member);

		await authMemberAgent.post(`/workflows/${activeWorkflow.id}/activate`);

		const response = await authMemberAgent.get('/workflows');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(2);

		const inactiveInResponse = response.body.data.find(
			(w: { id: string }) => w.id === inactiveWorkflow.id,
		);
		const activeInResponse = response.body.data.find(
			(w: { id: string }) => w.id === activeWorkflow.id,
		);

		// Inactive workflow should have null activeVersion
		expect(inactiveInResponse).toBeDefined();
		expect(inactiveInResponse.activeVersionId).toBeNull();

		// Active workflow should have populated activeVersion
		expect(activeInResponse).toBeDefined();
		expect(activeInResponse.active).toBe(true);
		expect(activeInResponse.activeVersion).toBeDefined();
		expect(activeInResponse.activeVersion).not.toBeNull();
		expect(activeInResponse.activeVersion.versionId).toBe(activeWorkflow.versionId);
		expect(activeInResponse.activeVersion.nodes).toEqual(activeWorkflow.nodes);
		expect(activeInResponse.activeVersion.connections).toEqual(activeWorkflow.connections);
	});

	test('should return activeVersion when filtering by active=true', async () => {
		await createWorkflowWithHistory({}, member);
		const activeWorkflow = await createWorkflowWithTriggerAndHistory({}, member);

		await authMemberAgent.post(`/workflows/${activeWorkflow.id}/activate`);

		const response = await authMemberAgent.get('/workflows?active=true');

		expect(response.statusCode).toBe(200);
		expect(response.body.data.length).toBe(1);

		const workflow = response.body.data[0];
		expect(workflow.id).toBe(activeWorkflow.id);
		expect(workflow.active).toBe(true);
		expect(workflow.activeVersion).toBeDefined();
		expect(workflow.activeVersion).not.toBeNull();
		expect(workflow.activeVersion.versionId).toBe(activeWorkflow.versionId);
	});
});

describe('GET /workflows/:id', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/workflows/2', null));

	test('should fail due to invalid API Key', testWithAPIKey('get', '/workflows/2', 'abcXYZ'));

	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.get('/workflows/2');
		expect(response.statusCode).toBe(404);
	});

	test('should retrieve workflow', async () => {
		// create and assign workflow to owner
		const workflow = await createWorkflowWithHistory({}, member);

		const response = await authMemberAgent.get(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);

		const {
			id,
			connections,
			active,
			activeVersionId,
			staticData,
			nodes,
			settings,
			name,
			createdAt,
			updatedAt,
			tags,
		} = response.body;

		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(false);
		expect(activeVersionId).toBeNull();
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(tags).toEqual([]);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toEqual(workflow.createdAt.toISOString());
		expect(updatedAt).toEqual(workflow.updatedAt.toISOString());
	});

	test('should retrieve non-owned workflow for owner', async () => {
		// create and assign workflow to owner
		const workflow = await createWorkflowWithHistory({}, member);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);

		const {
			id,
			connections,
			active,
			activeVersionId,
			staticData,
			nodes,
			settings,
			name,
			createdAt,
			updatedAt,
		} = response.body;

		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(false);
		expect(activeVersionId).toBeNull();
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toEqual(workflow.createdAt.toISOString());
		expect(updatedAt).toEqual(workflow.updatedAt.toISOString());
	});

	test('should retrieve workflow without pinned data', async () => {
		// create and assign workflow to owner
		const workflow = await createWorkflowWithHistory(
			{
				pinData: {
					Webhook1: [{ json: { first: 'first' } }],
				},
			},
			member,
		);

		const response = await authMemberAgent.get(`/workflows/${workflow.id}?excludePinnedData=true`);

		expect(response.statusCode).toBe(200);

		const { pinData } = response.body;

		expect(pinData).not.toBeDefined();
	});

	test('should return activeVersion as null for inactive workflow', async () => {
		const workflow = await createWorkflowWithHistory({}, member);

		const response = await authMemberAgent.get(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.active).toBe(false);
		expect(response.body.activeVersionId).toBe(null);
		expect(response.body.activeVersion).toBeNull();
	});

	test('should return activeVersion for active workflow', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, member);

		await authMemberAgent.post(`/workflows/${workflow.id}/activate`);

		const response = await authMemberAgent.get(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.active).toBe(true);
		expect(response.body.activeVersionId).toBe(workflow.versionId);
		expect(response.body.activeVersion).toBeDefined();
		expect(response.body.activeVersion).not.toBeNull();
		expect(response.body.activeVersion.versionId).toBe(workflow.versionId);
		expect(response.body.activeVersion.nodes).toEqual(workflow.nodes);
		expect(response.body.activeVersion.connections).toEqual(workflow.connections);
	});
});

describe('GET /workflows/:id/:versionId', () => {
	test(
		'should fail due to missing API Key',
		testWithAPIKey('get', '/workflows/123/version-123', null),
	);

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('get', '/workflows/123/version-123', 'abcXYZ'),
	);

	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.get('/workflows/non-existing/version-123');
		expect(response.statusCode).toBe(404);
	});

	test('should fail due to non-existing version', async () => {
		const workflow = await createWorkflow({}, owner);
		const response = await authOwnerAgent.get(`/workflows/${workflow.id}/non-existing-version`);
		expect(response.statusCode).toBe(404);
		expect(response.body.message).toBe('Version not found');
	});

	test('should retrieve workflow version', async () => {
		const workflow = await createWorkflow({}, owner);

		const versionId = uuid();
		const versionData = {
			versionId,
			workflowId: workflow.id,
			nodes: [
				{
					id: 'node1',
					name: 'Start',
					type: 'n8n-nodes-base.start',
					parameters: {},
					position: [0, 0] as [number, number],
					typeVersion: 1,
				},
			],
			connections: {},
			authors: 'Test User',
			name: 'Version Name',
			description: 'Version Description',
		};
		await createWorkflowHistoryItem(workflow.id, versionData);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}/${versionId}`);

		const body = response.body as Partial<WorkflowHistory>;
		expect(body).toEqual({
			workflowId: workflow.id,
			versionId,
			name: 'Version Name',
			description: 'Version Description',
			nodes: versionData.nodes,
			connections: versionData.connections,
			authors: 'Test User',
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			createdAt: expect.any(String),
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			updatedAt: expect.any(String),
		});
	});

	test('should retrieve version for non-owned workflow when owner', async () => {
		const workflow = await createWorkflow({}, member);

		const versionId = uuid();
		const versionName = 'Version Name';
		await createWorkflowHistoryItem(workflow.id, { versionId, name: versionName });

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}/${versionId}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.name).toBe(versionName);
	});

	test('should fail to retrieve version without read permission', async () => {
		const workflow = await createWorkflow({}, owner);
		const versionId = uuid();
		await createWorkflowHistoryItem(workflow.id, { versionId });

		const response = await authMemberAgent.get(`/workflows/${workflow.id}/${versionId}`);

		expect(response.statusCode).toBe(403);
	});
});

describe('DELETE /workflows/:id', () => {
	test('should fail due to missing API Key', testWithAPIKey('delete', '/workflows/2', null));

	test('should fail due to invalid API Key', testWithAPIKey('delete', '/workflows/2', 'abcXYZ'));

	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.delete('/workflows/2');
		expect(response.statusCode).toBe(404);
	});

	test('should delete the workflow', async () => {
		// create and assign workflow to owner
		const workflow = await createWorkflowWithHistory({}, member);

		const response = await authMemberAgent.delete(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);

		const {
			id,
			connections,
			active,
			activeVersionId,
			staticData,
			nodes,
			settings,
			name,
			createdAt,
			updatedAt,
		} = response.body;

		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(false);
		expect(activeVersionId).toBeNull();
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toEqual(workflow.createdAt.toISOString());
		expect(updatedAt).toEqual(workflow.updatedAt.toISOString());

		// make sure the workflow actually deleted from the db
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOneBy({
			workflowId: workflow.id,
		});

		expect(sharedWorkflow).toBeNull();
	});

	test('should delete non-owned workflow when owner', async () => {
		// create and assign workflow to owner
		const workflow = await createWorkflowWithHistory({}, member);

		const response = await authMemberAgent.delete(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);

		const {
			id,
			connections,
			active,
			activeVersionId,
			staticData,
			nodes,
			settings,
			name,
			createdAt,
			updatedAt,
		} = response.body;

		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(false);
		expect(activeVersionId).toBeNull();
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toEqual(workflow.createdAt.toISOString());
		expect(updatedAt).toEqual(workflow.updatedAt.toISOString());

		// make sure the workflow actually deleted from the db
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOneBy({
			workflowId: workflow.id,
		});

		expect(sharedWorkflow).toBeNull();
	});
});

describe('POST /workflows/:id/activate', () => {
	test('should fail due to missing API Key', testWithAPIKey('post', '/workflows/2/activate', null));

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('post', '/workflows/2/activate', 'abcXYZ'),
	);

	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.post('/workflows/2/activate');
		expect(response.statusCode).toBe(404);
	});

	test('should fail due to trying to activate a workflow without any nodes', async () => {
		const workflow = await createWorkflowWithHistory({ nodes: [] }, owner);
		const response = await authOwnerAgent.post(`/workflows/${workflow.id}/activate`);
		expect(response.statusCode).toBe(400);
	});

	test('should fail due to trying to activate a workflow without a trigger', async () => {
		const workflow = await createWorkflowWithHistory(
			{
				nodes: [
					{
						id: 'uuid-1234',
						name: 'Start',
						parameters: {},
						position: [-20, 260],
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
					},
				],
			},
			owner,
		);
		const response = await authOwnerAgent.post(`/workflows/${workflow.id}/activate`);
		expect(response.statusCode).toBe(400);
	});

	test('should set workflow as active', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, member);

		const response = await authMemberAgent.post(`/workflows/${workflow.id}/activate`);

		expect(response.statusCode).toBe(200);

		const {
			id,
			connections,
			active,
			activeVersionId,
			staticData,
			nodes,
			settings,
			name,
			createdAt,
			updatedAt,
		} = response.body;

		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(true);
		expect(activeVersionId).toBe(workflow.versionId);
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toEqual(workflow.createdAt.toISOString());
		expect(updatedAt).toEqual(workflow.updatedAt.toISOString());

		// check whether the workflow is on the database
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});

		expect(sharedWorkflow?.workflow.activeVersionId).toBe(workflow.versionId);

		// check whether the workflow is on the active workflow runner
		expect(await workflowRepository.isActive(workflow.id)).toBe(true);
	});

	test('should set activeVersionId when activating workflow', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, member);

		const response = await authMemberAgent.post(`/workflows/${workflow.id}/activate`);

		expect(response.statusCode).toBe(200);
		expect(response.body.active).toBe(true);
		expect(response.body.activeVersionId).toBe(workflow.versionId);

		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow', 'workflow.activeVersion'],
		});

		expect(sharedWorkflow?.workflow.activeVersionId).toBe(workflow.versionId);
		expect(sharedWorkflow?.workflow.activeVersion?.versionId).toBe(workflow.versionId);
		expect(sharedWorkflow?.workflow.activeVersion?.nodes).toEqual(workflow.nodes);
		expect(sharedWorkflow?.workflow.activeVersion?.connections).toEqual(workflow.connections);
	});

	test('should set non-owned workflow as active when owner', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, member);

		const response = await authMemberAgent.post(`/workflows/${workflow.id}/activate`).expect(200);

		const {
			id,
			connections,
			active,
			activeVersionId,
			staticData,
			nodes,
			settings,
			name,
			createdAt,
			updatedAt,
		} = response.body;

		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(true);
		expect(activeVersionId).toBe(workflow.versionId);
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toEqual(workflow.createdAt.toISOString());
		expect(updatedAt).toEqual(workflow.updatedAt.toISOString());

		// check whether the workflow is on the database
		const sharedOwnerWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: ownerPersonalProject.id,
				workflowId: workflow.id,
			},
		});

		expect(sharedOwnerWorkflow).toBeNull();

		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});

		expect(sharedWorkflow?.workflow.activeVersionId).toBe(workflow.versionId);

		// check whether the workflow is on the active workflow runner
		expect(await workflowRepository.isActive(workflow.id)).toBe(true);
	});
});

describe('POST /workflows/:id/deactivate', () => {
	test(
		'should fail due to missing API Key',
		testWithAPIKey('post', '/workflows/2/deactivate', null),
	);

	test(
		'should fail due to invalid API Key',
		testWithAPIKey('post', '/workflows/2/deactivate', 'abcXYZ'),
	);

	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.post('/workflows/2/deactivate');
		expect(response.statusCode).toBe(404);
	});

	test('should deactivate workflow', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, member);

		await authMemberAgent.post(`/workflows/${workflow.id}/activate`);

		const workflowDeactivationResponse = await authMemberAgent.post(
			`/workflows/${workflow.id}/deactivate`,
		);

		const {
			id,
			connections,
			active,
			activeVersionId,
			staticData,
			nodes,
			settings,
			name,
			createdAt,
			updatedAt,
		} = workflowDeactivationResponse.body;

		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(false);
		expect(activeVersionId).toBeNull();
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toBeDefined();
		expect(updatedAt).toBeDefined();

		// get the workflow after it was deactivated
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});

		// check whether the workflow is deactivated in the database
		expect(sharedWorkflow?.workflow.activeVersionId).toBeNull();

		expect(await workflowRepository.isActive(workflow.id)).toBe(false);
	});

	test('should clear activeVersionId when deactivating workflow', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, member);

		await authMemberAgent.post(`/workflows/${workflow.id}/activate`);
		let sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});

		expect(sharedWorkflow?.workflow.activeVersionId).toBe(workflow.versionId);

		const deactivateResponse = await authMemberAgent.post(`/workflows/${workflow.id}/deactivate`);

		expect(deactivateResponse.statusCode).toBe(200);
		expect(deactivateResponse.body.active).toBe(false);
		expect(deactivateResponse.body.activeVersionId).toBe(null);

		sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});

		expect(sharedWorkflow?.workflow.activeVersionId).toBeNull();
	});

	test('should deactivate non-owned workflow when owner', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, member);

		await authMemberAgent.post(`/workflows/${workflow.id}/activate`);

		const workflowDeactivationResponse = await authMemberAgent.post(
			`/workflows/${workflow.id}/deactivate`,
		);

		const {
			id,
			connections,
			active,
			activeVersionId,
			staticData,
			nodes,
			settings,
			name,
			createdAt,
			updatedAt,
		} = workflowDeactivationResponse.body;

		expect(id).toEqual(workflow.id);
		expect(name).toEqual(workflow.name);
		expect(connections).toEqual(workflow.connections);
		expect(active).toBe(false);
		expect(activeVersionId).toBe(null);
		expect(staticData).toEqual(workflow.staticData);
		expect(nodes).toEqual(workflow.nodes);
		expect(settings).toEqual(workflow.settings);
		expect(createdAt).toBeDefined();
		expect(updatedAt).toBeDefined();

		// check whether the workflow is deactivated in the database
		const sharedOwnerWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: ownerPersonalProject.id,
				workflowId: workflow.id,
			},
		});

		expect(sharedOwnerWorkflow).toBeNull();

		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});

		expect(sharedWorkflow?.workflow.activeVersionId).toBeNull();

		expect(await workflowRepository.isActive(workflow.id)).toBe(false);
	});
});

describe('POST /workflows', () => {
	test('should fail due to missing API Key', testWithAPIKey('post', '/workflows', null));

	test('should fail due to invalid API Key', testWithAPIKey('post', '/workflows', 'abcXYZ'));

	test('should fail due to invalid body', async () => {
		const response = await authOwnerAgent.post('/workflows').send({});
		expect(response.statusCode).toBe(400);
	});

	test('should create workflow', async () => {
		const payload = {
			name: 'testing',
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
			],
			connections: {},
			staticData: null,
			settings: {
				saveExecutionProgress: true,
				saveManualExecutions: true,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
				executionOrder: 'v1',
				callerPolicy: 'workflowsFromSameOwner',
				availableInMCP: false,
			},
		};

		const response = await authMemberAgent.post('/workflows').send(payload);

		expect(response.statusCode).toBe(200);

		const {
			id,
			name,
			nodes,
			connections,
			staticData,
			active,
			activeVersionId,
			settings,
			createdAt,
			updatedAt,
		} = response.body;

		expect(id).toBeDefined();
		expect(name).toBe(payload.name);
		expect(connections).toEqual(payload.connections);
		expect(settings).toEqual(payload.settings);
		expect(active).toBe(false);
		expect(staticData).toEqual(payload.staticData);
		expect(nodes).toEqual(payload.nodes);
		expect(activeVersionId).toBe(null);
		expect(createdAt).toBeDefined();
		expect(updatedAt).toEqual(createdAt);

		// check if created workflow in DB
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: response.body.id,
			},
			relations: ['workflow'],
		});

		expect(sharedWorkflow?.workflow.name).toBe(name);
		expect(sharedWorkflow?.workflow.createdAt.toISOString()).toBe(createdAt);
		expect(sharedWorkflow?.role).toEqual('workflow:owner');
	});

	test('should always create workflow history version', async () => {
		const payload = {
			name: 'testing',
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
			],
			connections: {},
			staticData: null,
			settings: {
				saveExecutionProgress: true,
				saveManualExecutions: true,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
			},
		};

		const response = await authMemberAgent.post('/workflows').send(payload);

		expect(response.statusCode).toBe(200);

		const { id } = response.body;

		expect(id).toBeDefined();
		expect(
			await Container.get(WorkflowHistoryRepository).count({ where: { workflowId: id } }),
		).toBe(1);
		const historyVersion = await Container.get(WorkflowHistoryRepository).findOne({
			where: {
				workflowId: id,
			},
		});
		expect(historyVersion).not.toBeNull();
		expect(historyVersion!.connections).toEqual(payload.connections);
		expect(historyVersion!.nodes).toEqual(payload.nodes);
	});

	test('should not add a starting node if the payload has no starting nodes', async () => {
		const response = await authMemberAgent.post('/workflows').send({
			name: 'testing',
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Hacker News',
					type: 'n8n-nodes-base.hackerNews',
					typeVersion: 1,
					position: [240, 300],
				},
			],
			connections: {},
			settings: {
				saveExecutionProgress: true,
				saveManualExecutions: true,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
			},
		});

		const found = response.body.nodes.find((node: INode) => STARTING_NODES.includes(node.type));

		expect(found).toBeUndefined();
	});
});

describe('PUT /workflows/:id', () => {
	test('should fail due to missing API Key', testWithAPIKey('put', '/workflows/1', null));

	test('should fail due to invalid API Key', testWithAPIKey('put', '/workflows/1', 'abcXYZ'));

	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.put('/workflows/1').send({
			name: 'testing',
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
			],
			connections: {},
			staticData: null,
			settings: {
				saveExecutionProgress: true,
				saveManualExecutions: true,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
			},
		});

		expect(response.statusCode).toBe(404);
	});

	test('should fail due to invalid body', async () => {
		const response = await authOwnerAgent.put('/workflows/1').send({
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
			],
			connections: {},
			staticData: null,
			settings: {
				saveExecutionProgress: true,
				saveManualExecutions: true,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
			},
		});

		expect(response.statusCode).toBe(400);
	});

	test('should update workflow', async () => {
		const workflow = await createWorkflowWithHistory({}, member);
		const payload = {
			name: 'name updated',
			nodes: [
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
				{
					id: 'uuid-1234',
					parameters: {},
					name: 'Cron',
					type: 'n8n-nodes-base.cron',
					typeVersion: 1,
					position: [400, 300],
				},
			],
			connections: {},
			staticData: '{"id":1}',
			settings: {
				saveExecutionProgress: false,
				saveManualExecutions: false,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
				callerPolicy: 'workflowsFromSameOwner',
				availableInMCP: false,
			},
		};

		const response = await authMemberAgent.put(`/workflows/${workflow.id}`).send(payload);

		const {
			id,
			name,
			nodes,
			connections,
			staticData,
			active,
			activeVersionId,
			settings,
			createdAt,
			updatedAt,
		} = response.body;

		expect(response.statusCode).toBe(200);

		expect(id).toBe(workflow.id);
		expect(name).toBe(payload.name);
		expect(connections).toEqual(payload.connections);
		expect(settings).toEqual(payload.settings);
		expect(active).toBe(false);
		expect(staticData).toMatchObject(JSON.parse(payload.staticData));
		expect(nodes).toEqual(payload.nodes);
		expect(activeVersionId).toBeNull();
		expect(createdAt).toBe(workflow.createdAt.toISOString());
		expect(updatedAt).not.toBe(workflow.updatedAt.toISOString());

		// check updated workflow in DB
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: response.body.id,
			},
			relations: ['workflow'],
		});

		expect(sharedWorkflow?.workflow.name).toBe(payload.name);
		expect(sharedWorkflow?.workflow.updatedAt.getTime()).toBeGreaterThan(
			workflow.updatedAt.getTime(),
		);
	});

	test('should update active version if workflow is published', async () => {
		const workflow = await createActiveWorkflow({}, member);

		const updatedPayload = {
			name: 'Updated active workflow',
			nodes: [
				{
					id: 'uuid-updated',
					parameters: { triggerTimes: { item: [{ mode: 'everyMinute' }] } },
					name: 'Updated Cron',
					type: 'n8n-nodes-base.cron',
					typeVersion: 1,
					position: [300, 400],
				},
			],
			connections: {},
			staticData: workflow.staticData,
			settings: workflow.settings,
		};

		const updateResponse = await authMemberAgent
			.put(`/workflows/${workflow.id}`)
			.send(updatedPayload);

		expect(updateResponse.statusCode).toBe(200);
		expect(updateResponse.body.active).toBe(true);
		expect(updateResponse.body.activeVersionId).not.toBeNull();
		expect(updateResponse.body.activeVersionId).not.toBe(workflow.versionId);
		expect(updateResponse.body.nodes).toEqual(updatedPayload.nodes);

		const versionInTheDb = await Container.get(WorkflowHistoryRepository).findOne({
			where: {
				workflowId: workflow.id,
				versionId: Not(workflow.versionId),
			},
		});

		expect(versionInTheDb).not.toBeNull();
		expect(updateResponse.body.activeVersionId).toBe(versionInTheDb!.versionId);
		expect(versionInTheDb!.nodes).toEqual(updatedPayload.nodes);
	});

	test('should not allow updating active field', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, member);

		const updatePayload = {
			name: 'Try to activate via update',
			nodes: workflow.nodes,
			connections: workflow.connections,
			staticData: workflow.staticData,
			settings: workflow.settings,
			active: true,
		};

		const updateResponse = await authMemberAgent
			.put(`/workflows/${workflow.id}`)
			.send(updatePayload);

		expect(updateResponse.statusCode).toBe(400);
		expect(updateResponse.body.message).toContain('active');
		expect(updateResponse.body.message).toContain('read-only');

		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow'],
		});

		expect(sharedWorkflow?.workflow.activeVersionId).toBeNull();
	});

	test('should update non-owned workflow if owner', async () => {
		const workflow = await createWorkflowWithHistory({}, member);

		const payload = {
			name: 'name owner updated',
			nodes: [
				{
					id: 'uuid-1',
					parameters: {},
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					position: [240, 300],
				},
				{
					id: 'uuid-2',
					parameters: {},
					name: 'Cron',
					type: 'n8n-nodes-base.cron',
					typeVersion: 1,
					position: [400, 300],
				},
			],
			connections: {},
			staticData: '{"id":1}',
			settings: {
				saveExecutionProgress: false,
				saveManualExecutions: false,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
				callerPolicy: 'workflowsFromSameOwner',
				availableInMCP: false,
			},
		};

		const response = await authMemberAgent.put(`/workflows/${workflow.id}`).send(payload);

		const {
			id,
			name,
			nodes,
			connections,
			staticData,
			active,
			activeVersionId,
			settings,
			createdAt,
			updatedAt,
		} = response.body;

		expect(response.statusCode).toBe(200);

		expect(id).toBe(workflow.id);
		expect(name).toBe(payload.name);
		expect(connections).toEqual(payload.connections);
		expect(settings).toEqual(payload.settings);
		expect(active).toBe(false);
		expect(staticData).toMatchObject(JSON.parse(payload.staticData));
		expect(nodes).toEqual(payload.nodes);
		expect(activeVersionId).toBeNull();
		expect(createdAt).toBe(workflow.createdAt.toISOString());
		expect(updatedAt).not.toBe(workflow.updatedAt.toISOString());

		// check updated workflow in DB
		const sharedOwnerWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: ownerPersonalProject.id,
				workflowId: response.body.id,
			},
		});

		expect(sharedOwnerWorkflow).toBeNull();

		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: response.body.id,
			},
			relations: ['workflow'],
		});

		expect(sharedWorkflow?.workflow.name).toBe(payload.name);
		expect(sharedWorkflow?.workflow.updatedAt.getTime()).toBeGreaterThan(
			workflow.updatedAt.getTime(),
		);
		expect(sharedWorkflow?.role).toEqual('workflow:owner');
	});

	test('should merge settings when updating workflow', async () => {
		const workflow = await createWorkflowWithHistory(
			{
				name: 'Test Workflow',
				nodes: [],
				connections: {},
				settings: {
					saveExecutionProgress: true,
					saveManualExecutions: true,
					saveDataErrorExecution: 'all',
					saveDataSuccessExecution: 'none',
					executionTimeout: 3600,
					timezone: 'America/New_York',
				},
			},
			member,
		);

		// Update with only partial settings
		const payload = {
			name: workflow.name,
			nodes: workflow.nodes,
			connections: workflow.connections,
			settings: {
				timezone: 'Europe/London', // Update
				callerPolicy: 'workflowsFromSameOwner', // Add
			},
		};

		const response = await authMemberAgent.put(`/workflows/${workflow.id}`).send(payload);

		expect(response.statusCode).toBe(200);

		expect(response.body.settings).toMatchObject({
			saveExecutionProgress: true,
			saveManualExecutions: true,
			saveDataErrorExecution: 'all',
			saveDataSuccessExecution: 'none',
			executionTimeout: 3600,
			timezone: 'Europe/London', // Updated
			callerPolicy: 'workflowsFromSameOwner', // Added
		});
	});
});

describe('GET /workflows/:id/tags', () => {
	test('should fail due to missing API Key', testWithAPIKey('get', '/workflows/2/tags', null));

	test('should fail due to invalid API Key', testWithAPIKey('get', '/workflows/2/tags', 'abcXYZ'));

	test('should fail if N8N_WORKFLOW_TAGS_DISABLED', async () => {
		globalConfig.tags.disabled = true;

		const response = await authOwnerAgent.get('/workflows/2/tags');

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('Workflow Tags Disabled');
	});

	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.get('/workflows/2/tags');

		expect(response.statusCode).toBe(404);
	});

	test('should return all tags of owned workflow', async () => {
		const tags = await Promise.all([await createTag({}), await createTag({})]);

		const workflow = await createWorkflowWithHistory({ tags }, member);

		const response = await authMemberAgent.get(`/workflows/${workflow.id}/tags`);

		expect(response.statusCode).toBe(200);
		expect(response.body.length).toBe(2);

		for (const tag of response.body) {
			const { id, name, createdAt, updatedAt } = tag;

			expect(id).toBeDefined();
			expect(name).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();

			tags.forEach((tag: TagEntity) => {
				expect(tags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
			});
		}
	});

	test('should return empty array if workflow does not have tags', async () => {
		const workflow = await createWorkflowWithHistory({}, member);

		const response = await authMemberAgent.get(`/workflows/${workflow.id}/tags`);

		expect(response.statusCode).toBe(200);
		expect(response.body.length).toBe(0);
	});
});

describe('PUT /workflows/:id/tags', () => {
	test('should fail due to missing API Key', testWithAPIKey('put', '/workflows/2/tags', null));

	test('should fail due to invalid API Key', testWithAPIKey('put', '/workflows/2/tags', 'abcXYZ'));

	test('should fail if N8N_WORKFLOW_TAGS_DISABLED', async () => {
		globalConfig.tags.disabled = true;

		const response = await authOwnerAgent.put('/workflows/2/tags').send([]);

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('Workflow Tags Disabled');
	});

	test('should fail due to non-existing workflow', async () => {
		const response = await authOwnerAgent.put('/workflows/2/tags').send([]);

		expect(response.statusCode).toBe(404);
	});

	test('should add the tags, workflow have not got tags previously', async () => {
		const workflow = await createWorkflow({}, member);
		const tags = await Promise.all([await createTag({}), await createTag({})]);

		const payload = [
			{
				id: tags[0].id,
			},
			{
				id: tags[1].id,
			},
		];

		const response = await authMemberAgent.put(`/workflows/${workflow.id}/tags`).send(payload);

		expect(response.statusCode).toBe(200);
		expect(response.body.length).toBe(2);

		for (const tag of response.body) {
			const { id, name, createdAt, updatedAt } = tag;

			expect(id).toBeDefined();
			expect(name).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();

			tags.forEach((tag: TagEntity) => {
				expect(tags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
			});
		}

		// Check the association in DB
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow.tags'],
		});

		expect(sharedWorkflow?.workflow.tags).toBeDefined();
		expect(sharedWorkflow?.workflow.tags?.length).toBe(2);
		if (sharedWorkflow?.workflow.tags !== undefined) {
			for (const tag of sharedWorkflow?.workflow.tags) {
				const { id, name, createdAt, updatedAt } = tag;

				expect(id).toBeDefined();
				expect(name).toBeDefined();
				expect(createdAt).toBeDefined();
				expect(updatedAt).toBeDefined();

				tags.forEach((tag: TagEntity) => {
					expect(tags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
				});
			}
		}
	});

	test('should add the tags, workflow have some tags previously', async () => {
		const tags = await Promise.all([await createTag({}), await createTag({}), await createTag({})]);
		const oldTags = [tags[0], tags[1]];
		const newTags = [tags[0], tags[2]];
		const workflow = await createWorkflow({ tags: oldTags }, member);

		// Check the association in DB
		const oldSharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow.tags'],
		});

		expect(oldSharedWorkflow?.workflow.tags).toBeDefined();
		expect(oldSharedWorkflow?.workflow.tags?.length).toBe(2);
		if (oldSharedWorkflow?.workflow.tags !== undefined) {
			for (const tag of oldSharedWorkflow?.workflow.tags) {
				const { id, name, createdAt, updatedAt } = tag;

				expect(id).toBeDefined();
				expect(name).toBeDefined();
				expect(createdAt).toBeDefined();
				expect(updatedAt).toBeDefined();

				oldTags.forEach((tag: TagEntity) => {
					expect(oldTags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
				});
			}
		}

		const payload = [
			{
				id: newTags[0].id,
			},
			{
				id: newTags[1].id,
			},
		];

		const response = await authMemberAgent.put(`/workflows/${workflow.id}/tags`).send(payload);

		expect(response.statusCode).toBe(200);
		expect(response.body.length).toBe(2);

		for (const tag of response.body) {
			const { id, name, createdAt, updatedAt } = tag;

			expect(id).toBeDefined();
			expect(name).toBeDefined();
			expect(createdAt).toBeDefined();
			expect(updatedAt).toBeDefined();

			newTags.forEach((tag: TagEntity) => {
				expect(newTags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
			});
		}

		// Check the association in DB
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow.tags'],
		});

		expect(sharedWorkflow?.workflow.tags).toBeDefined();
		expect(sharedWorkflow?.workflow.tags?.length).toBe(2);
		if (sharedWorkflow?.workflow.tags !== undefined) {
			for (const tag of sharedWorkflow?.workflow.tags) {
				const { id, name, createdAt, updatedAt } = tag;

				expect(id).toBeDefined();
				expect(name).toBeDefined();
				expect(createdAt).toBeDefined();
				expect(updatedAt).toBeDefined();

				newTags.forEach((tag: TagEntity) => {
					expect(newTags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
				});
			}
		}
	});

	test('should fail to add the tags as one does not exist, workflow should maintain previous tags', async () => {
		const tags = await Promise.all([await createTag({}), await createTag({})]);
		const oldTags = [tags[0], tags[1]];
		const workflow = await createWorkflow({ tags: oldTags }, member);

		// Check the association in DB
		const oldSharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow.tags'],
		});

		expect(oldSharedWorkflow?.workflow.tags).toBeDefined();
		expect(oldSharedWorkflow?.workflow.tags?.length).toBe(2);
		if (oldSharedWorkflow?.workflow.tags !== undefined) {
			for (const tag of oldSharedWorkflow?.workflow.tags) {
				const { id, name, createdAt, updatedAt } = tag;

				expect(id).toBeDefined();
				expect(name).toBeDefined();
				expect(createdAt).toBeDefined();
				expect(updatedAt).toBeDefined();

				oldTags.forEach((tag: TagEntity) => {
					expect(oldTags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
				});
			}
		}

		const payload = [
			{
				id: oldTags[0].id,
			},
			{
				id: 'TagDoesNotExist',
			},
		];

		const response = await authMemberAgent.put(`/workflows/${workflow.id}/tags`).send(payload);

		expect(response.statusCode).toBe(404);
		expect(response.body.message).toBe('Some tags not found');

		// Check the association in DB
		const sharedWorkflow = await Container.get(SharedWorkflowRepository).findOne({
			where: {
				projectId: memberPersonalProject.id,
				workflowId: workflow.id,
			},
			relations: ['workflow.tags'],
		});

		expect(sharedWorkflow?.workflow.tags).toBeDefined();
		expect(sharedWorkflow?.workflow.tags?.length).toBe(2);
		if (sharedWorkflow?.workflow.tags !== undefined) {
			for (const tag of sharedWorkflow?.workflow.tags) {
				const { id, name, createdAt, updatedAt } = tag;

				expect(id).toBeDefined();
				expect(name).toBeDefined();
				expect(createdAt).toBeDefined();
				expect(updatedAt).toBeDefined();

				oldTags.forEach((tag: TagEntity) => {
					expect(oldTags.some((savedTag) => savedTag.id === tag.id)).toBe(true);
				});
			}
		}
	});
});

describe('PUT /workflows/:id/transfer', () => {
	test('should transfer workflow to project', async () => {
		/**
		 * Arrange
		 */
		const firstProject = await createTeamProject('first-project', member);
		const secondProject = await createTeamProject('second-project', member);
		const workflow = await createWorkflow({}, firstProject);

		// Make data more similar to real world scenario by injecting additional records into the database
		await createTeamProject('third-project', member);
		await createWorkflow({}, firstProject);

		/**
		 * Act
		 */
		const response = await authMemberAgent.put(`/workflows/${workflow.id}/transfer`).send({
			destinationProjectId: secondProject.id,
		});

		/**
		 * Assert
		 */
		expect(response.statusCode).toBe(204);

		const workflowsInProjectResponse = await authMemberAgent
			.get(`/workflows?projectId=${secondProject.id}`)
			.send();

		expect(workflowsInProjectResponse.statusCode).toBe(200);
		expect(workflowsInProjectResponse.body.data[0].id).toBe(workflow.id);
	});

	test('if no destination project, should reject', async () => {
		/**
		 * Arrange
		 */
		const firstProject = await createTeamProject('first-project', member);
		const workflow = await createWorkflow({}, firstProject);

		/**
		 * Act
		 */
		const response = await authMemberAgent.put(`/workflows/${workflow.id}/transfer`).send({});

		/**
		 * Assert
		 */
		expect(response.statusCode).toBe(400);
	});
});

describe('PAY-3418: Node parameter persistence via Public API', () => {
	test('should create workflow with Code node with jsCode parameter and persist it', async () => {
		/**
		 * Test for PAY-3418: Verify that node parameters like jsCode are not stripped
		 * when submitted via the Public API. The fix adds additionalProperties: true to node.yml schema.
		 *
		 * Arrange: Create a workflow with a Code node containing jsCode parameter
		 */
		const jsCodeValue = `
return [
  {
    json: {
      message: 'Hello from Code node',
      timestamp: new Date().toISOString()
    }
  }
];
`;

		const payload = {
			name: 'Test Code Node Parameters',
			nodes: [
				{
					id: 'code-node-1',
					name: 'Code',
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [250, 300],
					parameters: {
						mode: 'runOnceForAllItems',
						language: 'javaScript',
						jsCode: jsCodeValue,
					},
				},
			],
			connections: {},
			staticData: null,
			settings: {
				saveExecutionProgress: true,
				saveManualExecutions: true,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
				executionOrder: 'v1',
				callerPolicy: 'workflowsFromSameOwner',
				availableInMCP: false,
			},
		};

		/**
		 * Act: Create the workflow via POST /workflows
		 */
		const createResponse = await authMemberAgent.post('/workflows').send(payload);

		/**
		 * Assert: Verify creation was successful and parameters are present
		 */
		expect(createResponse.statusCode).toBe(200);
		expect(createResponse.body.id).toBeDefined();

		const createdWorkflowId = createResponse.body.id;
		const codeNode = createResponse.body.nodes.find(
			(node: INode) => node.type === 'n8n-nodes-base.code',
		);

		expect(codeNode).toBeDefined();
		expect(codeNode.parameters).toBeDefined();
		expect(codeNode.parameters.jsCode).toBe(jsCodeValue);
		expect(codeNode.parameters.mode).toBe('runOnceForAllItems');
		expect(codeNode.parameters.language).toBe('javaScript');

		/**
		 * Act: Retrieve the workflow via GET /workflows/:id
		 */
		const getResponse = await authMemberAgent.get(`/workflows/${createdWorkflowId}`);

		/**
		 * Assert: Verify the jsCode parameter is persisted and returned
		 */
		expect(getResponse.statusCode).toBe(200);

		const retrievedCodeNode = getResponse.body.nodes.find(
			(node: INode) => node.type === 'n8n-nodes-base.code',
		);

		expect(retrievedCodeNode).toBeDefined();
		expect(retrievedCodeNode.parameters).toBeDefined();
		expect(retrievedCodeNode.parameters.jsCode).toBe(jsCodeValue);
		expect(retrievedCodeNode.parameters.mode).toBe('runOnceForAllItems');
		expect(retrievedCodeNode.parameters.language).toBe('javaScript');
	});

	test('should update workflow with Code node parameters and preserve them', async () => {
		/**
		 * Test for PAY-3418: Verify that node parameters are preserved on workflow updates.
		 *
		 * Arrange: Create a workflow with initial Code node
		 */
		const initialCode = 'return [{ json: { initial: true } }];';

		const initialPayload = {
			name: 'Initial Code Node Workflow',
			nodes: [
				{
					id: 'code-node-1',
					name: 'Code',
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [250, 300],
					parameters: {
						mode: 'runOnceForAllItems',
						language: 'javaScript',
						jsCode: initialCode,
					},
				},
			],
			connections: {},
			staticData: null,
			settings: {
				saveExecutionProgress: true,
				saveManualExecutions: true,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
				executionOrder: 'v1',
				callerPolicy: 'workflowsFromSameOwner',
				availableInMCP: false,
			},
		};

		const createResponse = await authMemberAgent.post('/workflows').send(initialPayload);
		expect(createResponse.statusCode).toBe(200);

		const workflowId = createResponse.body.id;

		/**
		 * Act: Update the workflow with modified Code node parameter
		 */
		const updatedCode = `
const result = {
  data: 'Updated workflow data',
  count: 42
};
return [{ json: result }];
`;

		const updatePayload = {
			name: 'Updated Code Node Workflow',
			nodes: [
				{
					id: 'code-node-1',
					name: 'Code',
					type: 'n8n-nodes-base.code',
					typeVersion: 2,
					position: [250, 300],
					parameters: {
						mode: 'runOnceForEachItem',
						language: 'javaScript',
						jsCode: updatedCode,
					},
				},
			],
			connections: {},
			staticData: null,
			settings: {
				saveExecutionProgress: false,
				saveManualExecutions: false,
				saveDataErrorExecution: 'all',
				saveDataSuccessExecution: 'all',
				executionTimeout: 3600,
				timezone: 'America/New_York',
				executionOrder: 'v1',
				callerPolicy: 'workflowsFromSameOwner',
				availableInMCP: false,
			},
		};

		const updateResponse = await authMemberAgent
			.put(`/workflows/${workflowId}`)
			.send(updatePayload);

		/**
		 * Assert: Verify update was successful and parameters are preserved
		 */
		expect(updateResponse.statusCode).toBe(200);
		expect(updateResponse.body.name).toBe('Updated Code Node Workflow');

		const updatedCodeNode = updateResponse.body.nodes.find(
			(node: INode) => node.type === 'n8n-nodes-base.code',
		);

		expect(updatedCodeNode).toBeDefined();
		expect(updatedCodeNode.parameters.jsCode).toBe(updatedCode);
		expect(updatedCodeNode.parameters.mode).toBe('runOnceForEachItem');
		expect(updatedCodeNode.parameters.language).toBe('javaScript');

		/**
		 * Act: Retrieve the updated workflow
		 */
		const getResponse = await authMemberAgent.get(`/workflows/${workflowId}`);

		/**
		 * Assert: Verify all parameters are still present after retrieval
		 */
		expect(getResponse.statusCode).toBe(200);

		const retrievedUpdatedNode = getResponse.body.nodes.find(
			(node: INode) => node.type === 'n8n-nodes-base.code',
		);

		expect(retrievedUpdatedNode).toBeDefined();
		expect(retrievedUpdatedNode.parameters.jsCode).toBe(updatedCode);
		expect(retrievedUpdatedNode.parameters.mode).toBe('runOnceForEachItem');
		expect(retrievedUpdatedNode.parameters.language).toBe('javaScript');
	});
});
