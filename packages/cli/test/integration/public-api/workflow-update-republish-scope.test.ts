import {
	createActiveWorkflow,
	createTeamProject,
	shareWorkflowWithUsers,
	createWorkflowWithTriggerAndHistory,
	linkUserToProject,
	mockInstance,
	testDb,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	ProjectRelationRepository,
	ProjectRepository,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { Telemetry } from '@/telemetry';

import { cleanupRolesAndScopes, createCustomRoleWithScopeSlugs } from '../shared/db/roles';
import { createMemberWithApiKey, createOwnerWithApiKey } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';

mockInstance(Telemetry);

const testServer = utils.setupTestServer({ endpointGroups: ['publicApi'] });
const license = testServer.license;

let owner: User;
let restrictedKeyMember: User;
let fullKeyMember: User;
let activateKeyMember: User;
let restrictedKeyAgent: SuperAgentTest;
let fullKeyAgent: SuperAgentTest;
let activateKeyAgent: SuperAgentTest;
let workflowRepository: WorkflowRepository;
let publishedVersionRepository: WorkflowPublishedVersionRepository;
let activeWorkflowManager: ActiveWorkflowManager;
let projectRepository: ProjectRepository;
let projectRelationRepository: ProjectRelationRepository;

// The API key can save but is not allowed to publish.
const UPDATE_ONLY_KEY_SCOPES = ['workflow:list', 'workflow:read', 'workflow:update'] as const;

const changedNodes = (workflow: { nodes: unknown[] }) =>
	(workflow.nodes as Array<Record<string, unknown>>).map((node) =>
		node.type === 'n8n-nodes-base.cron'
			? { ...node, parameters: { triggerTimes: { item: [{ mode: 'everyMinute' }] } } }
			: node,
	);

/** A published workflow, without going through the (scope-guarded) publish endpoint. */
const createPublishedWorkflow = async (owner: User | Project) => {
	const workflow = await createActiveWorkflow({}, owner);
	await publishedVersionRepository.setPublishedVersion(workflow.id, workflow.versionId);
	return workflow;
};

/** A project where the member may edit workflows but not publish them. */
const projectWithoutPublishFor = async (user: User, label: string) => {
	const role = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:update'], {
		roleType: 'project',
		displayName: `Workflow updater ${label}`,
		description: 'Can update workflows but not publish them',
	});
	const project: Project = await createTeamProject(`Project ${label}`, owner);
	await linkUserToProject(user, project, role.slug);
	return project;
};

beforeAll(async () => {
	Container.get(InstanceSettings).markAsLeader();

	owner = await createOwnerWithApiKey();
	restrictedKeyMember = await createMemberWithApiKey({ scopes: [...UPDATE_ONLY_KEY_SCOPES] });
	fullKeyMember = await createMemberWithApiKey();
	// Any member may mint a key carrying workflow:activate — it is justified by their own personal
	// project, and key scopes are not scoped per project.
	activateKeyMember = await createMemberWithApiKey({
		scopes: ['workflow:list', 'workflow:read', 'workflow:update', 'workflow:activate'],
	});

	await utils.initNodeTypes();

	workflowRepository = Container.get(WorkflowRepository);
	publishedVersionRepository = Container.get(WorkflowPublishedVersionRepository);
	projectRepository = Container.get(ProjectRepository);
	projectRelationRepository = Container.get(ProjectRelationRepository);
	activeWorkflowManager = Container.get(ActiveWorkflowManager);
	await activeWorkflowManager.init();

	restrictedKeyAgent = testServer.publicApiAgentFor(restrictedKeyMember);
	fullKeyAgent = testServer.publicApiAgentFor(fullKeyMember);
	activateKeyAgent = testServer.publicApiAgentFor(activateKeyMember);
});

beforeEach(async () => {
	await testDb.truncate([
		'WorkflowPublishedVersion',
		'SharedWorkflow',
		'WorkflowEntity',
		'WorkflowHistory',
		'WorkflowPublishHistory',
		'ProjectRelation',
		'Project',
	]);
	await cleanupRolesAndScopes();

	// Truncating Project also drops the personal projects created in beforeAll.
	for (const user of [owner, restrictedKeyMember, fullKeyMember, activateKeyMember]) {
		const project = await projectRepository.save(
			projectRepository.create({
				type: 'personal',
				name: user.createPersonalProjectName(),
				creatorId: user.id,
			}),
		);
		await projectRelationRepository.save(
			projectRelationRepository.create({
				projectId: project.id,
				userId: user.id,
				role: { slug: 'project:personalOwner' },
			}),
		);
	}
});

afterEach(async () => {
	await activeWorkflowManager?.removeAll();
});

describe('PUT /workflows/:id republish and the API key publish scope', () => {
	test('direct publish is rejected for a key without workflow:activate', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, restrictedKeyMember);

		const response = await restrictedKeyAgent.post(`/workflows/${workflow.id}/publish`);

		expect(response.statusCode).toBe(403);
	});

	test('a key lacking workflow:activate saves a draft instead of republishing', async () => {
		const workflow = await createPublishedWorkflow(restrictedKeyMember);

		const response = await restrictedKeyAgent.put(`/workflows/${workflow.id}`).send({
			name: workflow.name,
			nodes: changedNodes(workflow),
			connections: workflow.connections,
			settings: workflow.settings ?? {},
		});

		const stored = await workflowRepository.findOneBy({ id: workflow.id });

		// The draft it is allowed to write survives; only the publication is refused.
		expect(response.statusCode).toBe(403);
		expect(response.body.reason).toBe('insufficient_api_key_scope');
		expect(response.body.message).toContain('saved as a draft');
		expect(response.body.versionId).toBe(stored?.versionId);
		expect(stored?.versionId).not.toBe(workflow.versionId);
		expect(stored?.activeVersionId).toBe(workflow.versionId);
	});

	test('keeps the draft when the project role blocks the republish', async () => {
		const project = await projectWithoutPublishFor(fullKeyMember, 'content');

		const workflow = await createPublishedWorkflow(project);

		const response = await fullKeyAgent.put(`/workflows/${workflow.id}`).send({
			name: workflow.name,
			nodes: changedNodes(workflow),
			connections: workflow.connections,
			settings: workflow.settings ?? {},
		});

		const stored = await workflowRepository.findOneBy({ id: workflow.id });

		// Draft versions are a workflow:update capability; publishing them is not.
		expect(response.statusCode).toBe(403);
		expect(response.body.reason).toBe('insufficient_permissions');
		expect(response.body.message).toContain('saved as a draft');
		expect(response.body.versionId).toBe(stored?.versionId);
		expect(stored?.versionId).not.toBe(workflow.versionId);
		expect(stored?.activeVersionId).toBe(workflow.versionId);
	});

	test('settings-only change is allowed without publish permission', async () => {
		const project = await projectWithoutPublishFor(fullKeyMember, 'settings');

		const workflow = await createPublishedWorkflow(project);

		const response = await fullKeyAgent
			.put(`/workflows/${workflow.id}?publishIfActive=false`)
			.send({
				name: workflow.name,
				nodes: workflow.nodes,
				connections: workflow.connections,
				settings: { ...(workflow.settings ?? {}), timezone: 'America/New_York' },
			});

		const stored = await workflowRepository.findOneBy({ id: workflow.id });

		// Changing settings is a workflow:update concern; re-applying the already-live version
		// publishes nothing new, so it must not require publish permission.
		expect(response.statusCode).toBe(200);
		expect(stored?.settings?.timezone).toBe('America/New_York');
		expect(stored?.versionId).toBe(workflow.versionId);
		expect(stored?.activeVersionId).toBe(workflow.versionId);
	});

	test('unpublished workflow is still updatable by a key without workflow:activate', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, restrictedKeyMember);

		const response = await restrictedKeyAgent.put(`/workflows/${workflow.id}`).send({
			name: workflow.name,
			nodes: changedNodes(workflow),
			connections: workflow.connections,
			settings: workflow.settings ?? {},
		});

		const stored = await workflowRepository.findOneBy({ id: workflow.id });

		expect(response.statusCode).toBe(200);
		expect(stored?.versionId).not.toBe(workflow.versionId);
		expect(stored?.activeVersionId).toBeNull();
	});

	test('publishIfActive=false still stages a draft for a key without workflow:activate', async () => {
		const workflow = await createPublishedWorkflow(restrictedKeyMember);

		const response = await restrictedKeyAgent
			.put(`/workflows/${workflow.id}?publishIfActive=false`)
			.send({
				name: workflow.name,
				nodes: changedNodes(workflow),
				connections: workflow.connections,
				settings: workflow.settings ?? {},
			});

		const stored = await workflowRepository.findOneBy({ id: workflow.id });

		expect(response.statusCode).toBe(200);
		expect(stored?.versionId).not.toBe(workflow.versionId);
		expect(stored?.activeVersionId).toBe(workflow.versionId);
	});

	// A key scope is a ceiling on the key, never a grant to the account. Holding workflow:activate
	// must not let a member publish where their project role cannot.
	describe('an API key with workflow:activate in a project the member cannot publish in', () => {
		const publishedWorkflowInProjectWithoutPublish = async (label: string) =>
			await createPublishedWorkflow(await projectWithoutPublishFor(activateKeyMember, label));

		test('cannot publish through the direct publish route', async () => {
			const workflow = await publishedWorkflowInProjectWithoutPublish('direct');

			const response = await activateKeyAgent.post(`/workflows/${workflow.id}/publish`);
			const stored = await workflowRepository.findOneBy({ id: workflow.id });

			expect(response.statusCode).toBe(403);
			expect(stored?.activeVersionId).toBe(workflow.versionId);
		});

		test('cannot publish through a save either', async () => {
			const workflow = await publishedWorkflowInProjectWithoutPublish('save');

			const response = await activateKeyAgent.put(`/workflows/${workflow.id}`).send({
				name: workflow.name,
				nodes: changedNodes(workflow),
				connections: workflow.connections,
				settings: workflow.settings ?? {},
			});
			const stored = await workflowRepository.findOneBy({ id: workflow.id });

			expect(response.statusCode).toBe(403);
			expect(response.body.reason).toBe('insufficient_permissions');
			expect(stored?.activeVersionId).toBe(workflow.versionId);
		});
	});

	// Sharing a workflow as editor carries workflow:publish, and the publish endpoint honours it, so a
	// save must honour it too even though the sharee holds no role in the owning project.
	test('a workflow shared as editor is still republished on save', async () => {
		license.enable('feat:sharing');

		const project = await createTeamProject('Owning project', owner);
		const workflow = await createPublishedWorkflow(project);
		await shareWorkflowWithUsers(workflow, [fullKeyMember]);

		const response = await fullKeyAgent.put(`/workflows/${workflow.id}`).send({
			name: workflow.name,
			nodes: changedNodes(workflow),
			connections: workflow.connections,
			settings: workflow.settings ?? {},
		});

		const stored = await workflowRepository.findOneBy({ id: workflow.id });

		expect(response.statusCode).toBe(200);
		expect(stored?.activeVersionId).not.toBe(workflow.versionId);
		expect(stored?.activeVersionId).toBe(stored?.versionId);
	});
});
