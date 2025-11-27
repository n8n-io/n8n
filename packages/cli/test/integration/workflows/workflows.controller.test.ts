import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	createWorkflow,
	createActiveWorkflow,
	setActiveVersion,
	createWorkflowWithHistory,
	createWorkflowWithTriggerAndHistory,
	shareWorkflowWithProjects,
	shareWorkflowWithUsers,
	randomCredentialPayload,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type {
	User,
	ListQueryDb,
	WorkflowFolderUnionFull,
	Role,
	WorkflowHistory,
	WorkflowEntity,
} from '@n8n/db';
import {
	ProjectRepository,
	WorkflowHistoryRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import { DateTime } from 'luxon';
import { PROJECT_ROOT, type INode, type IPinData, type IWorkflowBase } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { EventService } from '@/events/event.service';
import { License } from '@/license';
import { ProjectService } from '@/services/project.service.ee';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';
import { createFolder } from '@test-integration/db/folders';

import { saveCredential } from '../shared/db/credentials';
import { createCustomRoleWithScopeSlugs, cleanupRolesAndScopes } from '../shared/db/roles';
import { assignTagToWorkflow, createTag } from '../shared/db/tags';
import { createManyUsers, createMember, createOwner } from '../shared/db/users';
import { createWorkflowHistoryItem } from '../shared/db/workflow-history';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';
import { makeWorkflow, MOCK_PINDATA } from '../shared/utils/';

let owner: User;
let member: User;
let anotherMember: User;

let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows'],
	enabledFeatures: ['feat:sharing'],
	quotas: {
		'quota:maxTeamProjects': -1,
	},
});

const { objectContaining, arrayContaining, any } = expect;

const activeWorkflowManagerLike = mockInstance(ActiveWorkflowManager);

let projectRepository: ProjectRepository;
let workflowRepository: WorkflowRepository;
let workflowHistoryRepository: WorkflowHistoryRepository;
let eventService: EventService;
let globalConfig: GlobalConfig;
let folderListMissingRole: Role;

beforeEach(async () => {
	await testDb.truncate([
		'SharedWorkflow',
		'ProjectRelation',
		'Folder',
		'WorkflowEntity',
		'WorkflowHistory',
		'TagEntity',
		'Project',
		'User',
	]);
	await cleanupRolesAndScopes();
	projectRepository = Container.get(ProjectRepository);
	workflowRepository = Container.get(WorkflowRepository);
	workflowHistoryRepository = Container.get(WorkflowHistoryRepository);
	eventService = Container.get(EventService);
	globalConfig = Container.get(GlobalConfig);
	owner = await createOwner();
	authOwnerAgent = testServer.authAgentFor(owner);
	member = await createMember();
	authMemberAgent = testServer.authAgentFor(member);
	anotherMember = await createMember();

	folderListMissingRole = await createCustomRoleWithScopeSlugs(['workflow:read', 'workflow:list'], {
		roleType: 'project',
		displayName: 'Workflow Read-Only',
		description: 'Can only read and list workflows',
	});

	// Default: draft/publish feature disabled
	globalConfig.workflows.draftPublishEnabled = false;
});

afterEach(() => {
	jest.clearAllMocks();
});

describe('POST /workflows', () => {
	const testWithPinData = async (withPinData: boolean) => {
		const workflow = makeWorkflow({ withPinData });
		const response = await authOwnerAgent.post('/workflows').send(workflow);
		expect(response.statusCode).toBe(200);
		return (response.body.data as { pinData: IPinData }).pinData;
	};

	test('should store pin data for node in workflow', async () => {
		const pinData = await testWithPinData(true);
		expect(pinData).toMatchObject(MOCK_PINDATA);
	});

	test('should set pin data to null if no pin data', async () => {
		const pinData = await testWithPinData(false);
		expect(pinData).toBeNull();
	});

	test('should return scopes on created workflow', async () => {
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
			active: false,
			activeVersionId: null,
		};

		const response = await authMemberAgent.post('/workflows').send(payload);

		expect(response.statusCode).toBe(200);

		const {
			data: { id, scopes },
		} = response.body;

		expect(id).toBeDefined();
		expect(scopes).toEqual(
			[
				'workflow:delete',
				'workflow:execute',
				'workflow:move',
				'workflow:read',
				'workflow:share',
				'workflow:update',
			].sort(),
		);
	});

	test('should create workflow with uiContext parameter', async () => {
		const payload = {
			name: 'testing with context',
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
			settings: {},
			active: false,
			activeVersionId: null,
			uiContext: 'workflow_list',
		};

		const response = await authMemberAgent.post('/workflows').send(payload);

		expect(response.statusCode).toBe(200);

		const {
			data: { id, name },
		} = response.body;

		expect(id).toBeDefined();
		expect(name).toBe('testing with context');
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
			active: false,
			activeVersionId: null,
		};

		const response = await authOwnerAgent.post('/workflows').send(payload);

		expect(response.statusCode).toBe(200);

		const {
			data: { id },
		} = response.body;

		expect(id).toBeDefined();
		expect(await workflowHistoryRepository.count({ where: { workflowId: id } })).toBe(1);
		const historyVersion = await workflowHistoryRepository.findOne({
			where: {
				workflowId: id,
			},
		});
		expect(historyVersion).not.toBeNull();
		expect(historyVersion!.connections).toEqual(payload.connections);
		expect(historyVersion!.nodes).toEqual(payload.nodes);
	});

	test('should create workflow as active when active: true is provided in POST body', async () => {
		const payload = {
			name: 'active workflow',
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
			settings: {},
			active: true,
		};

		const response = await authOwnerAgent.post('/workflows').send(payload);

		expect(response.statusCode).toBe(200);

		const {
			data: { id, versionId, activeVersionId, active },
		} = response.body;

		expect(id).toBeDefined();
		expect(versionId).toBeDefined();
		expect(activeVersionId).toBe(versionId); // Should be set to current version
		expect(active).toBe(true);

		// Verify in database
		const workflow = await workflowRepository.findOneBy({ id });
		expect(workflow?.activeVersionId).toBe(versionId);

		// Verify history was created
		const historyVersion = await workflowHistoryRepository.findOne({
			where: {
				workflowId: id,
				versionId,
			},
		});
		expect(historyVersion).not.toBeNull();
	});

	test('create workflow in personal project by default', async () => {
		//
		// ARRANGE
		//
		const tag = await createTag({ name: 'A' });
		const workflow = makeWorkflow();
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);

		//
		// ACT
		//
		const response = await authOwnerAgent
			.post('/workflows')
			.send({ ...workflow, tags: [tag.id] })
			.expect(200);

		//
		// ASSERT
		//
		await Container.get(SharedWorkflowRepository).findOneOrFail({
			where: {
				projectId: personalProject.id,
				workflowId: response.body.data.id,
			},
		});
		expect(response.body.data).toMatchObject({
			active: false,
			activeVersionId: null,
			id: expect.any(String),
			name: workflow.name,
			sharedWithProjects: [],
			usedCredentials: [],
			homeProject: {
				id: personalProject.id,
				name: personalProject.name,
				type: personalProject.type,
			},
			tags: [{ id: tag.id, name: tag.name }],
		});
		expect(response.body.data.shared).toBeUndefined();
	});

	test('creates workflow in a specific project if the projectId is passed', async () => {
		//
		// ARRANGE
		//
		const tag = await createTag({ name: 'A' });
		const workflow = makeWorkflow();
		const project = await projectRepository.save(
			projectRepository.create({
				name: 'Team Project',
				type: 'team',
			}),
		);
		await Container.get(ProjectService).addUser(project.id, {
			userId: owner.id,
			role: 'project:admin',
		});

		//
		// ACT
		//
		const response = await authOwnerAgent
			.post('/workflows')
			.send({ ...workflow, projectId: project.id, tags: [tag.id] })
			.expect(200);

		//
		// ASSERT
		//
		await Container.get(SharedWorkflowRepository).findOneOrFail({
			where: {
				projectId: project.id,
				workflowId: response.body.data.id,
			},
		});
		expect(response.body.data).toMatchObject({
			active: false,
			activeVersionId: null,
			id: expect.any(String),
			name: workflow.name,
			sharedWithProjects: [],
			usedCredentials: [],
			homeProject: {
				id: project.id,
				name: project.name,
				type: project.type,
			},
			tags: [{ id: tag.id, name: tag.name }],
		});
		expect(response.body.data.shared).toBeUndefined();
	});

	test('does not create the workflow in a specific project if the user is not part of the project', async () => {
		//
		// ARRANGE
		//
		const workflow = makeWorkflow();
		const project = await projectRepository.save(
			projectRepository.create({
				name: 'Team Project',
				type: 'team',
			}),
		);

		//
		// ACT
		//
		await testServer
			.authAgentFor(member)
			.post('/workflows')
			.send({ ...workflow, projectId: project.id })
			//
			// ASSERT
			//
			.expect(400, {
				code: 400,
				message: "You don't have the permissions to save the workflow in this project.",
			});
	});

	test('does not create the workflow in a specific project if the user does not have the right role to do so', async () => {
		//
		// ARRANGE
		//
		const workflow = makeWorkflow();
		const project = await projectRepository.save(
			projectRepository.create({
				name: 'Team Project',
				type: 'team',
			}),
		);
		await Container.get(ProjectService).addUser(project.id, {
			userId: member.id,
			role: 'project:viewer',
		});

		//
		// ACT
		//
		await testServer
			.authAgentFor(member)
			.post('/workflows')
			.send({ ...workflow, projectId: project.id })
			//
			// ASSERT
			//
			.expect(400, {
				code: 400,
				message: "You don't have the permissions to save the workflow in this project.",
			});
	});

	test('create link workflow with folder if one is provided', async () => {
		//
		// ARRANGE
		//
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const folder = await createFolder(personalProject, { name: 'Folder 1' });

		const workflow = makeWorkflow();

		//
		// ACT
		//
		const response = await authOwnerAgent
			.post('/workflows')
			.send({ ...workflow, parentFolderId: folder.id });

		//
		// ASSERT
		//

		expect(response.body.data).toMatchObject({
			active: false,
			activeVersionId: null,
			id: expect.any(String),
			name: workflow.name,
			sharedWithProjects: [],
			usedCredentials: [],
			homeProject: {
				id: personalProject.id,
				name: personalProject.name,
				type: personalProject.type,
			},
			parentFolder: {
				id: folder.id,
				name: folder.name,
			},
		});
		expect(response.body.data.shared).toBeUndefined();
	});

	test('create workflow without parent folder if no folder is provided', async () => {
		//
		// ARRANGE
		//
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const workflow = makeWorkflow();

		//
		// ACT
		//
		const response = await authOwnerAgent
			.post('/workflows')
			.send({ ...workflow })
			.expect(200);

		//
		// ASSERT
		//

		expect(response.body.data).toMatchObject({
			active: false,
			activeVersionId: null,
			id: expect.any(String),
			name: workflow.name,
			sharedWithProjects: [],
			usedCredentials: [],
			homeProject: {
				id: personalProject.id,
				name: personalProject.name,
				type: personalProject.type,
			},
			parentFolder: null,
		});
		expect(response.body.data.shared).toBeUndefined();
	});

	test('create workflow without parent is provided folder does not exist in the project', async () => {
		//
		// ARRANGE
		//
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const workflow = makeWorkflow();

		//
		// ACT
		//
		const response = await authOwnerAgent
			.post('/workflows')
			.send({ ...workflow, parentFolderId: 'non-existing-folder-id' })
			.expect(200);

		//
		// ASSERT
		//

		expect(response.body.data).toMatchObject({
			active: false,
			activeVersionId: null,
			id: expect.any(String),
			name: workflow.name,
			sharedWithProjects: [],
			usedCredentials: [],
			homeProject: {
				id: personalProject.id,
				name: personalProject.name,
				type: personalProject.type,
			},
			parentFolder: null,
		});
		expect(response.body.data.shared).toBeUndefined();
	});
});

describe('GET /workflows/:workflowId', () => {
	test('should return pin data', async () => {
		const workflow = makeWorkflow({ withPinData: true });
		const workflowCreationResponse = await authOwnerAgent.post('/workflows').send(workflow);

		const { id } = workflowCreationResponse.body.data as { id: string };
		const workflowRetrievalResponse = await authOwnerAgent.get(`/workflows/${id}`);

		expect(workflowRetrievalResponse.statusCode).toBe(200);
		const { pinData } = workflowRetrievalResponse.body.data as { pinData: IPinData };
		expect(pinData).toMatchObject(MOCK_PINDATA);
	});

	test('should return tags', async () => {
		const tag = await createTag({ name: 'A' });
		const workflow = await createWorkflow({ tags: [tag] }, owner);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`).expect(200);

		expect(response.body.data).toMatchObject({
			tags: [expect.objectContaining({ id: tag.id, name: tag.name })],
		});
	});

	test('should return active version', async () => {
		const workflow = await createActiveWorkflow({}, owner);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`).expect(200);

		const { data: responseData } = response.body as { data: { activeVersion: WorkflowHistory } };
		const { activeVersion } = responseData;

		expect(activeVersion).toMatchObject({
			versionId: workflow.activeVersionId,
			workflowId: workflow.id,
		});
	});

	test('should return parent folder', async () => {
		const personalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);

		const folder1 = await createFolder(personalProject, { name: 'Folder 1' });

		const folder2 = await createFolder(personalProject, {
			name: 'Folder 2',
			parentFolder: folder1,
		});

		const workflow1 = await createWorkflow({ parentFolder: folder2 }, owner);

		const workflow2 = await createWorkflow({}, owner);

		const workflow3 = await createWorkflow({ parentFolder: folder1 }, owner);

		const workflowInNestedFolderWithGrantParent = await authOwnerAgent
			.get(`/workflows/${workflow1.id}`)
			.expect(200);

		expect(workflowInNestedFolderWithGrantParent.body.data).toMatchObject({
			parentFolder: expect.objectContaining({
				id: folder2.id,
				name: folder2.name,
				parentFolderId: folder1.id,
			}),
		});

		const workflowInProjectRoot = await authOwnerAgent
			.get(`/workflows/${workflow2.id}`)
			.expect(200);

		expect(workflowInProjectRoot.body.data).toMatchObject({
			parentFolder: null,
		});

		const workflowInNestedFolder = await authOwnerAgent
			.get(`/workflows/${workflow3.id}`)
			.expect(200);

		expect(workflowInNestedFolder.body.data).toMatchObject({
			parentFolder: expect.objectContaining({
				id: folder1.id,
				name: folder1.name,
				parentFolderId: null,
			}),
		});
	});
});

describe('GET /workflows', () => {
	test('should return zero workflows if none exist', async () => {
		const response = await authOwnerAgent.get('/workflows').expect(200);

		expect(response.body).toEqual({ count: 0, data: [] });
	});

	test('should return workflows', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);

		const nodes: INode[] = [
			{
				id: uuid(),
				name: 'Action Network',
				type: 'n8n-nodes-base.actionNetwork',
				parameters: {},
				typeVersion: 1,
				position: [0, 0],
				credentials: {
					actionNetworkApi: {
						id: credential.id,
						name: credential.name,
					},
				},
			},
		];

		const tag = await createTag({ name: 'A' });

		await createWorkflow({ name: 'First', nodes, tags: [tag] }, owner);
		await createWorkflow({ name: 'Second' }, owner);

		const response = await authOwnerAgent.get('/workflows').expect(200);

		expect(response.body).toEqual({
			count: 2,
			data: arrayContaining([
				objectContaining({
					id: any(String),
					name: 'First',
					active: false,
					activeVersionId: null,
					createdAt: any(String),
					updatedAt: any(String),
					tags: [{ id: any(String), name: 'A' }],
					versionId: any(String),
					homeProject: {
						id: ownerPersonalProject.id,
						name: owner.createPersonalProjectName(),
						icon: null,
						type: ownerPersonalProject.type,
					},
					sharedWithProjects: [],
				}),
				objectContaining({
					id: any(String),
					name: 'Second',
					active: false,
					activeVersionId: null,
					createdAt: any(String),
					updatedAt: any(String),
					tags: [],
					versionId: any(String),
					homeProject: {
						id: ownerPersonalProject.id,
						name: owner.createPersonalProjectName(),
						icon: null,
						type: ownerPersonalProject.type,
					},
					sharedWithProjects: [],
				}),
			]),
		});

		const found = response.body.data.find(
			(w: ListQueryDb.Workflow.WithOwnership) => w.name === 'First',
		);

		expect(found.nodes).toBeUndefined();
		expect(found.sharedWithProjects).toHaveLength(0);
		expect(found.usedCredentials).toBeUndefined();
	});

	test('should return workflows with scopes when ?includeScopes=true', async () => {
		const [member1, member2] = await createManyUsers(2, {
			role: { slug: 'global:member' },
		});

		const teamProject = await createTeamProject(undefined, member1);
		await linkUserToProject(member2, teamProject, 'project:editor');

		const credential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		const nodes: INode[] = [
			{
				id: uuid(),
				name: 'Action Network',
				type: 'n8n-nodes-base.actionNetwork',
				parameters: {},
				typeVersion: 1,
				position: [0, 0],
				credentials: {
					actionNetworkApi: {
						id: credential.id,
						name: credential.name,
					},
				},
			},
		];

		const tag = await createTag({ name: 'A' });

		const [savedWorkflow1, savedWorkflow2] = await Promise.all([
			createWorkflow({ name: 'First', nodes, tags: [tag] }, teamProject),
			createWorkflow({ name: 'Second' }, member2),
		]);

		await shareWorkflowWithProjects(savedWorkflow2, [{ project: teamProject }]);

		{
			const response = await testServer.authAgentFor(member1).get('/workflows?includeScopes=true');

			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(2);

			const workflows = response.body.data as Array<IWorkflowBase & { scopes: Scope[] }>;
			const wf1 = workflows.find((w) => w.id === savedWorkflow1.id)!;
			const wf2 = workflows.find((w) => w.id === savedWorkflow2.id)!;

			// Team workflow
			expect(wf1.id).toBe(savedWorkflow1.id);
			expect(wf1.scopes).toEqual(
				[
					'workflow:delete',
					'workflow:execute',
					'workflow:move',
					'workflow:read',
					'workflow:update',
				].sort(),
			);

			// Shared workflow
			expect(wf2.id).toBe(savedWorkflow2.id);
			expect(wf2.scopes).toEqual(['workflow:read', 'workflow:update', 'workflow:execute'].sort());
		}

		{
			const response = await testServer.authAgentFor(member2).get('/workflows?includeScopes=true');

			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(2);

			const workflows = response.body.data as Array<IWorkflowBase & { scopes: Scope[] }>;
			const wf1 = workflows.find((w) => w.id === savedWorkflow1.id)!;
			const wf2 = workflows.find((w) => w.id === savedWorkflow2.id)!;

			// Team workflow
			expect(wf1.id).toBe(savedWorkflow1.id);
			expect(wf1.scopes).toEqual([
				'workflow:delete',
				'workflow:execute',
				'workflow:read',
				'workflow:update',
			]);

			// Shared workflow
			expect(wf2.id).toBe(savedWorkflow2.id);
			expect(wf2.scopes).toEqual(
				[
					'workflow:delete',
					'workflow:execute',
					'workflow:move',
					'workflow:read',
					'workflow:share',
					'workflow:update',
				].sort(),
			);
		}

		{
			const response = await testServer.authAgentFor(owner).get('/workflows?includeScopes=true');

			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(2);

			const workflows = response.body.data as Array<IWorkflowBase & { scopes: Scope[] }>;
			const wf1 = workflows.find((w) => w.id === savedWorkflow1.id)!;
			const wf2 = workflows.find((w) => w.id === savedWorkflow2.id)!;

			// Team workflow
			expect(wf1.id).toBe(savedWorkflow1.id);
			expect(wf1.scopes).toEqual(
				[
					'workflow:create',
					'workflow:delete',
					'workflow:execute',
					'workflow:list',
					'workflow:move',
					'workflow:read',
					'workflow:share',
					'workflow:update',
				].sort(),
			);

			// Shared workflow
			expect(wf2.id).toBe(savedWorkflow2.id);
			expect(wf2.scopes).toEqual(
				[
					'workflow:create',
					'workflow:delete',
					'workflow:execute',
					'workflow:list',
					'workflow:move',
					'workflow:read',
					'workflow:share',
					'workflow:update',
				].sort(),
			);
		}
	});

	describe('filter', () => {
		test('should filter workflows by field: query', async () => {
			await createWorkflow({ name: 'First', description: 'A workflow' }, owner);
			await createWorkflow({ name: 'Second', description: 'Also a workflow' }, owner);
			await createWorkflow({ name: 'Third', description: 'My first workflow' }, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={"query":"first"}')
				.expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: [objectContaining({ name: 'First' }), objectContaining({ name: 'Third' })],
			});
		});

		test('should filter workflows by field: active', async () => {
			await createActiveWorkflow({}, owner);
			await createWorkflow({}, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "active": true }')
				.expect(200);

			expect(response.body).toEqual({
				count: 1,
				data: [objectContaining({ active: true, activeVersionId: expect.any(String) })],
			});
		});

		test('should filter workflows by field: availableInMCP', async () => {
			const workflow1 = await createWorkflow({ settings: { availableInMCP: true } }, owner);
			await createWorkflow({ settings: {} }, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "availableInMCP": true }')
				.expect(200);

			expect(response.body).toEqual({
				count: 1,
				data: [objectContaining({ id: workflow1.id })],
			});
		});

		test('should filter workflows by field: tags (AND operator)', async () => {
			const workflow1 = await createWorkflow({ name: 'First' }, owner);
			const workflow2 = await createWorkflow({ name: 'Second' }, owner);

			const baseDate = DateTime.now();

			await createTag(
				{
					name: 'A',
					createdAt: baseDate.toJSDate(),
				},
				workflow1,
			);
			await createTag(
				{
					name: 'B',
					createdAt: baseDate.plus({ seconds: 1 }).toJSDate(),
				},
				workflow1,
			);

			const tagC = await createTag({ name: 'C' }, workflow2);

			await assignTagToWorkflow(tagC, workflow2);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "tags": ["A", "B"] }')
				.expect(200);

			expect(response.body).toEqual({
				count: 1,
				data: [
					objectContaining({
						name: 'First',
						tags: expect.arrayContaining([
							{ id: any(String), name: 'A' },
							{ id: any(String), name: 'B' },
						]),
					}),
				],
			});
		});

		test('should filter workflows by projectId', async () => {
			const workflow = await createWorkflow({ name: 'First' }, owner);
			const pp = await projectRepository.getPersonalProjectForUserOrFail(owner.id);

			const response1 = await authOwnerAgent
				.get('/workflows')
				.query(`filter={ "projectId": "${pp.id}" }`)
				.expect(200);

			expect(response1.body.data).toHaveLength(1);
			expect(response1.body.data[0].id).toBe(workflow.id);

			const response2 = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "projectId": "Non-Existing Project ID" }')
				.expect(200);

			expect(response2.body.data).toHaveLength(0);
		});

		test('should filter by personal project and return only workflows where the user is owner', async () => {
			const workflow = await createWorkflow({ name: 'First' }, owner);
			const workflow2 = await createWorkflow({ name: 'Second' }, member);
			await shareWorkflowWithUsers(workflow2, [owner]);
			const pp = await projectRepository.getPersonalProjectForUserOrFail(owner.id);

			const response1 = await authOwnerAgent
				.get('/workflows')
				.query(`filter={ "projectId": "${pp.id}" }`)
				.expect(200);

			expect(response1.body.data).toHaveLength(1);
			expect(response1.body.data[0].id).toBe(workflow.id);

			const response2 = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "projectId": "Non-Existing Project ID" }')
				.expect(200);

			expect(response2.body.data).toHaveLength(0);

			const response3 = await authOwnerAgent.get('/workflows').query('filter={}').expect(200);
			expect(response3.body.data).toHaveLength(2);
		});

		test('should filter by personal project and return only workflows where the user is member', async () => {
			const workflow = await createWorkflow({ name: 'First' }, member);
			const workflow2 = await createWorkflow({ name: 'Second' }, owner);
			await shareWorkflowWithUsers(workflow2, [member]);
			const pp = await projectRepository.getPersonalProjectForUserOrFail(member.id);

			const response1 = await authMemberAgent
				.get('/workflows')
				.query(`filter={ "projectId": "${pp.id}" }`)
				.expect(200);

			expect(response1.body.data).toHaveLength(1);
			expect(response1.body.data[0].id).toBe(workflow.id);

			const response2 = await authMemberAgent
				.get('/workflows')
				.query('filter={ "projectId": "Non-Existing Project ID" }')
				.expect(200);

			expect(response2.body.data).toHaveLength(0);

			const response3 = await authMemberAgent.get('/workflows').query('filter={}').expect(200);
			expect(response3.body.data).toHaveLength(2);
		});

		test('should filter workflows by parentFolderId', async () => {
			const pp = await projectRepository.getPersonalProjectForUserOrFail(owner.id);

			const folder1 = await createFolder(pp, { name: 'Folder 1' });

			const workflow1 = await createWorkflow({ name: 'First', parentFolder: folder1 }, owner);

			const workflow2 = await createWorkflow({ name: 'Second' }, owner);

			const response1 = await authOwnerAgent
				.get('/workflows')
				.query(`filter={ "parentFolderId": "${folder1.id}" }`)
				.expect(200);

			expect(response1.body.data).toHaveLength(1);
			expect(response1.body.data[0].id).toBe(workflow1.id);

			// if not provided, looks for workflows without a parentFolder
			const response2 = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "parentFolderId": "0" }');
			expect(200);

			expect(response2.body.data).toHaveLength(1);
			expect(response2.body.data[0].id).toBe(workflow2.id);
		});

		test('should filter workflows by nodeTypes', async () => {
			const httpWorkflow = await createWorkflow(
				{
					name: 'HTTP Workflow',
					nodes: [
						{
							id: uuid(),
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							parameters: {},
							typeVersion: 1,
							position: [0, 0],
						},
					],
				},
				owner,
			);

			const slackWorkflow = await createWorkflow(
				{
					name: 'Slack Workflow',
					nodes: [
						{
							id: uuid(),
							name: 'Slack',
							type: 'n8n-nodes-base.slack',
							parameters: {},
							typeVersion: 1,
							position: [0, 0],
						},
					],
				},
				owner,
			);

			const mixedWorkflow = await createWorkflow(
				{
					name: 'Mixed Workflow',
					nodes: [
						{
							id: uuid(),
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							parameters: {},
							typeVersion: 1,
							position: [0, 0],
						},
						{
							id: uuid(),
							name: 'Slack',
							type: 'n8n-nodes-base.slack',
							parameters: {},
							typeVersion: 1,
							position: [100, 0],
						},
					],
				},
				owner,
			);

			// Filter by single node type
			const httpResponse = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "nodeTypes": ["n8n-nodes-base.httpRequest"] }&select=["nodes"]')
				.expect(200);

			expect(httpResponse.body.data).toHaveLength(2);
			const httpWorkflowIds = httpResponse.body.data.map((w: any) => w.id);
			expect(httpWorkflowIds).toContain(httpWorkflow.id);
			expect(httpWorkflowIds).toContain(mixedWorkflow.id);
			expect(httpResponse.body.data[0].nodes).toHaveLength(1);
			expect(httpResponse.body.data[1].nodes).toHaveLength(2);

			// Filter by multiple node types (OR operation - returns workflows containing ANY of the specified node types)
			const multipleResponse = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "nodeTypes": ["n8n-nodes-base.httpRequest", "n8n-nodes-base.slack"] }')
				.expect(200);

			expect(multipleResponse.body.data).toHaveLength(3);
			const multipleWorkflowIds = multipleResponse.body.data.map((w: any) => w.id);
			expect(multipleWorkflowIds).toContain(httpWorkflow.id);
			expect(multipleWorkflowIds).toContain(slackWorkflow.id);
			expect(multipleWorkflowIds).toContain(mixedWorkflow.id);

			// Filter by non-existent node type
			const emptyResponse = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "nodeTypes": ["n8n-nodes-base.nonExistent"] }')
				.expect(200);

			expect(emptyResponse.body.data).toHaveLength(0);
		});

		test('should all workflows when filtering by empty nodeTypes array', async () => {
			await createWorkflow(
				{
					name: 'Test Workflow',
					nodes: [
						{
							id: uuid(),
							name: 'Start',
							type: 'n8n-nodes-base.start',
							parameters: {},
							typeVersion: 1,
							position: [0, 0],
						},
					],
				},
				owner,
			);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "nodeTypes": [] }')
				.expect(200);

			expect(response.body.data).toHaveLength(1); // Should return all workflows when nodeTypes is empty
		});
	});

	describe('select', () => {
		test('should select workflow field: name', async () => {
			await createWorkflow({ name: 'First' }, owner);
			await createWorkflow({ name: 'Second' }, owner);

			const response = await authOwnerAgent.get('/workflows').query('select=["name"]').expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{ id: any(String), name: 'First' },
					{ id: any(String), name: 'Second' },
				]),
			});
		});

		test('should select workflow field: active', async () => {
			await createActiveWorkflow({}, owner);
			await createWorkflow({}, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["active"]')
				.expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{ id: any(String), active: true },
					{ id: any(String), active: false },
				]),
			});
		});

		test('should select workflow field: activeVersionId', async () => {
			const activeWorkflow = await createActiveWorkflow({}, owner);
			await createWorkflow({}, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["activeVersionId"]')
				.expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{ id: any(String), activeVersionId: activeWorkflow.versionId },
					{ id: any(String), activeVersionId: null },
				]),
			});
		});

		test('should select workflow field: tags', async () => {
			const firstWorkflow = await createWorkflow({ name: 'First' }, owner);
			const secondWorkflow = await createWorkflow({ name: 'Second' }, owner);

			await createTag({ name: 'A' }, firstWorkflow);
			await createTag({ name: 'B' }, secondWorkflow);

			const response = await authOwnerAgent.get('/workflows').query('select=["tags"]').expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					objectContaining({ id: any(String), tags: [{ id: any(String), name: 'A' }] }),
					objectContaining({ id: any(String), tags: [{ id: any(String), name: 'B' }] }),
				]),
			});
		});

		test('should select workflow fields: createdAt and updatedAt', async () => {
			const firstWorkflowCreatedAt = '2023-08-08T09:31:25.000Z';
			const firstWorkflowUpdatedAt = '2023-08-08T09:31:40.000Z';
			const secondWorkflowCreatedAt = '2023-07-07T09:31:25.000Z';
			const secondWorkflowUpdatedAt = '2023-07-07T09:31:40.000Z';

			await createWorkflow(
				{
					createdAt: new Date(firstWorkflowCreatedAt),
					updatedAt: new Date(firstWorkflowUpdatedAt),
				},
				owner,
			);
			await createWorkflow(
				{
					createdAt: new Date(secondWorkflowCreatedAt),
					updatedAt: new Date(secondWorkflowUpdatedAt),
				},
				owner,
			);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["createdAt", "updatedAt"]')
				.expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					objectContaining({
						id: any(String),
						createdAt: firstWorkflowCreatedAt,
						updatedAt: firstWorkflowUpdatedAt,
					}),
					objectContaining({
						id: any(String),
						createdAt: secondWorkflowCreatedAt,
						updatedAt: secondWorkflowUpdatedAt,
					}),
				]),
			});
		});

		test('should select workflow field: versionId', async () => {
			const firstWorkflowVersionId = 'e95ccdde-2b4e-4fd0-8834-220a2b5b4353';
			const secondWorkflowVersionId = 'd099b8dc-b1d8-4b2d-9b02-26f32c0ee785';

			await createWorkflow({ versionId: firstWorkflowVersionId }, owner);
			await createWorkflow({ versionId: secondWorkflowVersionId }, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["versionId"]')
				.expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{ id: any(String), versionId: firstWorkflowVersionId },
					{ id: any(String), versionId: secondWorkflowVersionId },
				]),
			});
		});

		test('should select workflow field: ownedBy', async () => {
			await createWorkflow({}, owner);
			await createWorkflow({}, owner);
			const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
				owner.id,
			);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["ownedBy"]')
				.expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{
						id: any(String),
						homeProject: {
							id: ownerPersonalProject.id,
							name: owner.createPersonalProjectName(),
							icon: null,
							type: ownerPersonalProject.type,
						},
						sharedWithProjects: [],
					},
					{
						id: any(String),
						homeProject: {
							id: ownerPersonalProject.id,
							name: owner.createPersonalProjectName(),
							icon: null,
							type: ownerPersonalProject.type,
						},
						sharedWithProjects: [],
					},
				]),
			});
		});

		test('should select workflow field: parentFolder', async () => {
			const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
				owner.id,
			);
			const folder = await createFolder(ownerPersonalProject, { name: 'Folder 1' });

			await createWorkflow({ parentFolder: folder }, owner);
			await createWorkflow({}, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["parentFolder"]')
				.expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{
						id: any(String),
						parentFolder: {
							id: folder.id,
							name: folder.name,
							parentFolderId: null,
						},
					},
					{
						id: any(String),
						parentFolder: null,
					},
				]),
			});
		});
	});

	describe('sortBy', () => {
		test('should fail when trying to sort by non sortable column', async () => {
			await authOwnerAgent.get('/workflows').query('sortBy=nonSortableColumn:asc').expect(500);
		});

		test('should sort by createdAt column', async () => {
			await createWorkflow({ name: 'First' }, owner);
			await createWorkflow({ name: 'Second' }, owner);

			let response = await authOwnerAgent
				.get('/workflows')
				.query('sortBy=createdAt:asc')
				.expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					expect.objectContaining({ name: 'First' }),
					expect.objectContaining({ name: 'Second' }),
				]),
			});

			response = await authOwnerAgent.get('/workflows').query('sortBy=createdAt:desc').expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					expect.objectContaining({ name: 'Second' }),
					expect.objectContaining({ name: 'First' }),
				]),
			});
		});

		test('should sort by name column', async () => {
			await createWorkflow({ name: 'a' }, owner);
			await createWorkflow({ name: 'b' }, owner);
			await createWorkflow({ name: 'My workflow' }, owner);

			let response;

			response = await authOwnerAgent.get('/workflows').query('sortBy=name:asc').expect(200);

			expect(response.body).toEqual({
				count: 3,
				data: [
					expect.objectContaining({ name: 'a' }),
					expect.objectContaining({ name: 'b' }),
					expect.objectContaining({ name: 'My workflow' }),
				],
			});

			response = await authOwnerAgent.get('/workflows').query('sortBy=name:desc').expect(200);

			expect(response.body).toEqual({
				count: 3,
				data: [
					expect.objectContaining({ name: 'My workflow' }),
					expect.objectContaining({ name: 'b' }),
					expect.objectContaining({ name: 'a' }),
				],
			});
		});

		test('should sort by updatedAt column', async () => {
			const futureDate = new Date();
			futureDate.setDate(futureDate.getDate() + 10);

			await createWorkflow({ name: 'First', updatedAt: futureDate }, owner);
			await createWorkflow({ name: 'Second' }, owner);

			let response;

			response = await authOwnerAgent.get('/workflows').query('sortBy=updatedAt:asc').expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					expect.objectContaining({ name: 'Second' }),
					expect.objectContaining({ name: 'First' }),
				]),
			});

			response = await authOwnerAgent.get('/workflows').query('sortBy=name:desc').expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					expect.objectContaining({ name: 'First' }),
					expect.objectContaining({ name: 'Second' }),
				]),
			});
		});
	});

	describe('pagination', () => {
		beforeEach(async () => {
			await createWorkflow({ name: 'Workflow 1' }, owner);
			await createWorkflow({ name: 'Workflow 2' }, owner);
			await createWorkflow({ name: 'Workflow 3' }, owner);
			await createWorkflow({ name: 'Workflow 4' }, owner);
			await createWorkflow({ name: 'Workflow 5' }, owner);
		});

		test('should fail when skip is provided without take', async () => {
			await authOwnerAgent.get('/workflows').query('skip=2').expect(500);
		});

		test('should handle skip with take parameter', async () => {
			const response = await authOwnerAgent.get('/workflows').query('skip=2&take=2').expect(200);

			const body = response.body as { data: WorkflowEntity[]; count: number };
			expect(body.count).toBe(5);
			expect(body.data).toHaveLength(2);
			const names = body.data.map((item) => item.name);
			expect(names).toEqual(expect.arrayContaining(['Workflow 3', 'Workflow 4']));
		});

		test('should handle pagination with sorting', async () => {
			const response = await authOwnerAgent
				.get('/workflows')
				.query('take=2&skip=1&sortBy=name:desc');

			const body = response.body as { data: WorkflowEntity[]; count: number };
			expect(body.count).toBe(5);
			expect(body.data).toHaveLength(2);
			const names = body.data.map((item) => item.name);
			expect(names).toEqual(expect.arrayContaining(['Workflow 3', 'Workflow 4']));
		});

		test('should handle pagination with filtering', async () => {
			// Create additional workflows with specific names for filtering
			await createWorkflow({ name: 'Special Workflow 1' }, owner);
			await createWorkflow({ name: 'Special Workflow 2' }, owner);
			await createWorkflow({ name: 'Special Workflow 3' }, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('take=2&skip=1')
				.query('filter={"query":"Special"}')
				.expect(200);

			const body = response.body as { data: WorkflowEntity[]; count: number };
			expect(body.count).toBe(3); // Only 3 'Special' workflows exist
			expect(body.data).toHaveLength(2); // // We skip 1
			const names = body.data.map((item) => item.name);
			expect(names).toEqual(expect.arrayContaining(['Special Workflow 2', 'Special Workflow 3']));
		});

		test('should return empty array when pagination exceeds total count', async () => {
			const response = await authOwnerAgent.get('/workflows').query('take=2&skip=10').expect(200);

			expect(response.body.data).toHaveLength(0);
			expect(response.body.count).toBe(5);
		});

		test('should return all results when no pagination parameters are provided', async () => {
			const response = await authOwnerAgent.get('/workflows').expect(200);

			expect(response.body.data).toHaveLength(5);
			expect(response.body.count).toBe(5);
		});
	});
});

describe('GET /workflows?onlySharedWithMe=true', () => {
	test('should return only workflows shared with me', async () => {
		const memberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member.id,
		);

		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);

		await createWorkflow({ name: 'First' }, owner);
		await createWorkflow({ name: 'Second' }, member);
		const workflow3 = await createWorkflow({ name: 'Third' }, member);

		await shareWorkflowWithUsers(workflow3, [owner]);

		const response = await authOwnerAgent.get('/workflows').query({ onlySharedWithMe: true });
		expect(200);

		expect(response.body).toEqual({
			count: 1,
			data: arrayContaining([
				objectContaining({
					id: any(String),
					name: 'Third',
					active: false,
					activeVersionId: null,
					createdAt: any(String),
					updatedAt: any(String),
					versionId: any(String),
					parentFolder: null,
					homeProject: {
						id: memberPersonalProject.id,
						name: member.createPersonalProjectName(),
						icon: null,
						type: memberPersonalProject.type,
					},
					sharedWithProjects: [
						objectContaining({
							id: any(String),
							name: ownerPersonalProject.name,
							icon: null,
							type: ownerPersonalProject.type,
						}),
					],
				}),
			]),
		});
	});
});

describe('GET /workflows?includeFolders=true', () => {
	test('should return zero workflows and folders if none exist', async () => {
		const response = await authOwnerAgent.get('/workflows').query({ includeFolders: true });

		expect(response.body).toEqual({ count: 0, data: [] });
	});

	test('should return workflows and folders', async () => {
		const credential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);

		const nodes: INode[] = [
			{
				id: uuid(),
				name: 'Action Network',
				type: 'n8n-nodes-base.actionNetwork',
				parameters: {},
				typeVersion: 1,
				position: [0, 0],
				credentials: {
					actionNetworkApi: {
						id: credential.id,
						name: credential.name,
					},
				},
			},
		];

		const tag = await createTag({ name: 'A' });

		await createWorkflow({ name: 'First', nodes, tags: [tag] }, owner);
		await createWorkflow({ name: 'Second' }, owner);
		await createFolder(ownerPersonalProject, { name: 'Folder' });

		const response = await authOwnerAgent.get('/workflows').query({ includeFolders: true });
		expect(200);

		expect(response.body).toEqual({
			count: 3,
			data: arrayContaining([
				objectContaining({
					resource: 'workflow',
					id: any(String),
					name: 'First',
					active: false,
					activeVersionId: null,
					createdAt: any(String),
					updatedAt: any(String),
					tags: [{ id: any(String), name: 'A' }],
					versionId: any(String),
					homeProject: {
						id: ownerPersonalProject.id,
						name: owner.createPersonalProjectName(),
						icon: null,
						type: ownerPersonalProject.type,
					},
					sharedWithProjects: [],
				}),
				objectContaining({
					id: any(String),
					name: 'Second',
					activeVersionId: null,
					createdAt: any(String),
					updatedAt: any(String),
					tags: [],
					versionId: any(String),
					homeProject: {
						id: ownerPersonalProject.id,
						name: owner.createPersonalProjectName(),
						icon: null,
						type: ownerPersonalProject.type,
					},
					sharedWithProjects: [],
				}),
				objectContaining({
					resource: 'folder',
					id: any(String),
					name: 'Folder',
					createdAt: any(String),
					updatedAt: any(String),
					tags: [],
					homeProject: {
						id: ownerPersonalProject.id,
						name: owner.createPersonalProjectName(),
						icon: null,
						type: ownerPersonalProject.type,
					},
					parentFolder: null,
					workflowCount: 0,
					subFolderCount: 0,
				}),
			]),
		});

		const found = response.body.data.find(
			(w: ListQueryDb.Workflow.WithOwnership) => w.name === 'First',
		);

		expect(found.nodes).toBeUndefined();
		expect(found.sharedWithProjects).toHaveLength(0);
		expect(found.usedCredentials).toBeUndefined();
	});

	test('should NOT returns folders without folder:list scope', async () => {
		const [member1, member2] = await createManyUsers(2, {
			role: { slug: 'global:member' },
		});

		const teamProject = await createTeamProject(undefined, member1);
		await linkUserToProject(member2, teamProject, folderListMissingRole.slug);

		const [savedWorkflow1, savedWorkflow2, savedFolder1] = await Promise.all([
			createWorkflow({ name: 'First' }, teamProject),
			createWorkflow({ name: 'Second' }, teamProject),
			createFolder(teamProject, { name: 'Folder' }),
		]);

		{
			const response = await testServer
				.authAgentFor(member1)
				.get(
					`/workflows?filter={ "projectId": "${teamProject.id}" }&includeScopes=true&includeFolders=true`,
				);

			expect(response.statusCode).toBe(200);
			// project owner
			expect(response.body.data.length).toBe(3);

			const workflows = response.body.data as Array<WorkflowFolderUnionFull & { scopes: Scope[] }>;
			const wf1 = workflows.find((wf) => wf.id === savedWorkflow1.id)!;
			const wf2 = workflows.find((wf) => wf.id === savedWorkflow2.id)!;
			const f1 = workflows.find((wf) => wf.id === savedFolder1.id)!;

			// Team workflow
			expect(wf1.id).toBe(savedWorkflow1.id);
			expect(wf2.id).toBe(savedWorkflow2.id);
			expect(f1.id).toBe(savedFolder1.id);
		}

		{
			const response = await testServer
				.authAgentFor(member2)
				.get(
					`/workflows?filter={ "projectId": "${teamProject.id}" }&includeScopes=true&includeFolders=true`,
				);

			expect(response.statusCode).toBe(200);
			// project member
			expect(response.body.data.length).toBe(2);

			const workflows = response.body.data as Array<WorkflowFolderUnionFull & { scopes: Scope[] }>;
			const wf1 = workflows.find((w) => w.id === savedWorkflow1.id)!;
			const wf2 = workflows.find((w) => w.id === savedWorkflow2.id)!;
			const f1 = workflows.find((wf) => wf.id === savedFolder1.id)!;

			// Team workflow
			expect(wf1.id).toBe(savedWorkflow1.id);
			expect(wf2.id).toBe(savedWorkflow2.id);
			expect(f1).toBeUndefined();
		}
	});

	test('should return workflows with scopes and folders when ?includeScopes=true', async () => {
		const [member1, member2] = await createManyUsers(2, {
			role: { slug: 'global:member' },
		});

		const teamProject = await createTeamProject(undefined, member1);
		await linkUserToProject(member2, teamProject, 'project:editor');

		const credential = await saveCredential(randomCredentialPayload(), {
			user: owner,
			role: 'credential:owner',
		});

		const nodes: INode[] = [
			{
				id: uuid(),
				name: 'Action Network',
				type: 'n8n-nodes-base.actionNetwork',
				parameters: {},
				typeVersion: 1,
				position: [0, 0],
				credentials: {
					actionNetworkApi: {
						id: credential.id,
						name: credential.name,
					},
				},
			},
		];

		const tag = await createTag({ name: 'A' });

		const [savedWorkflow1, savedWorkflow2, savedFolder1] = await Promise.all([
			createWorkflow({ name: 'First', nodes, tags: [tag] }, teamProject),
			createWorkflow({ name: 'Second' }, member2),
			createFolder(teamProject, { name: 'Folder' }),
		]);

		await shareWorkflowWithProjects(savedWorkflow2, [{ project: teamProject }]);

		{
			const response = await testServer
				.authAgentFor(member1)
				.get('/workflows?includeScopes=true&includeFolders=true');

			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(3);

			const workflows = response.body.data as Array<WorkflowFolderUnionFull & { scopes: Scope[] }>;
			const wf1 = workflows.find((wf) => wf.id === savedWorkflow1.id)!;
			const wf2 = workflows.find((wf) => wf.id === savedWorkflow2.id)!;
			const f1 = workflows.find((wf) => wf.id === savedFolder1.id)!;

			// Team workflow
			expect(wf1.id).toBe(savedWorkflow1.id);
			expect(wf1.scopes).toEqual(
				[
					'workflow:delete',
					'workflow:execute',
					'workflow:move',
					'workflow:read',
					'workflow:update',
				].sort(),
			);

			// Shared workflow
			expect(wf2.id).toBe(savedWorkflow2.id);
			expect(wf2.scopes).toEqual(['workflow:read', 'workflow:update', 'workflow:execute'].sort());

			expect(f1.id).toBe(savedFolder1.id);
		}

		{
			const response = await testServer
				.authAgentFor(member2)
				.get('/workflows?includeScopes=true&includeFolders=true');

			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(3);

			const workflows = response.body.data as Array<WorkflowFolderUnionFull & { scopes: Scope[] }>;
			const wf1 = workflows.find((w) => w.id === savedWorkflow1.id)!;
			const wf2 = workflows.find((w) => w.id === savedWorkflow2.id)!;
			const f1 = workflows.find((wf) => wf.id === savedFolder1.id)!;

			// Team workflow
			expect(wf1.id).toBe(savedWorkflow1.id);
			expect(wf1.scopes).toEqual([
				'workflow:delete',
				'workflow:execute',
				'workflow:read',
				'workflow:update',
			]);

			// Shared workflow
			expect(wf2.id).toBe(savedWorkflow2.id);
			expect(wf2.scopes).toEqual(
				[
					'workflow:delete',
					'workflow:execute',
					'workflow:move',
					'workflow:read',
					'workflow:share',
					'workflow:update',
				].sort(),
			);

			expect(f1.id).toBe(savedFolder1.id);
		}

		{
			const response = await testServer
				.authAgentFor(owner)
				.get('/workflows?includeScopes=true&includeFolders=true');

			expect(response.statusCode).toBe(200);
			expect(response.body.data.length).toBe(3);

			const workflows = response.body.data as Array<WorkflowFolderUnionFull & { scopes: Scope[] }>;
			const wf1 = workflows.find((w) => w.id === savedWorkflow1.id)!;
			const wf2 = workflows.find((w) => w.id === savedWorkflow2.id)!;
			const f1 = workflows.find((wf) => wf.id === savedFolder1.id)!;

			// Team workflow
			expect(wf1.id).toBe(savedWorkflow1.id);
			expect(wf1.scopes).toEqual(
				[
					'workflow:create',
					'workflow:delete',
					'workflow:execute',
					'workflow:list',
					'workflow:move',
					'workflow:read',
					'workflow:share',
					'workflow:update',
				].sort(),
			);

			// Shared workflow
			expect(wf2.id).toBe(savedWorkflow2.id);
			expect(wf2.scopes).toEqual(
				[
					'workflow:create',
					'workflow:delete',
					'workflow:execute',
					'workflow:list',
					'workflow:move',
					'workflow:read',
					'workflow:share',
					'workflow:update',
				].sort(),
			);

			expect(f1.id).toBe(savedFolder1.id);
		}
	});

	describe('filter', () => {
		test('should filter workflows and folders by field: query', async () => {
			const workflow1 = await createWorkflow({ name: 'First' }, owner);
			await createWorkflow({ name: 'Second' }, owner);

			const ownerProject = await getPersonalProject(owner);

			const folder1 = await createFolder(ownerProject, { name: 'First' });
			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={"query":"First"}&includeFolders=true')
				.expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: [
					objectContaining({ id: folder1.id, name: 'First' }),
					objectContaining({ id: workflow1.id, name: 'First' }),
				],
			});
		});

		test('should filter workflows and folders by field: active', async () => {
			const workflow1 = await createActiveWorkflow({}, owner);
			await createWorkflow({}, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "active": true }&includeFolders=true')
				.expect(200);

			expect(response.body).toEqual({
				count: 1,
				data: [
					objectContaining({ id: workflow1.id, active: true, versionId: workflow1.versionId }),
				],
			});
		});

		test('should filter workflows and folders by field: tags (AND operator)', async () => {
			const baseDate = DateTime.now();

			const workflow1 = await createWorkflow(
				{ name: 'First', updatedAt: baseDate.toJSDate() },
				owner,
			);
			const workflow2 = await createWorkflow(
				{ name: 'Second', updatedAt: baseDate.toJSDate() },
				owner,
			);

			const ownerProject = await getPersonalProject(owner);

			const tagA = await createTag(
				{
					name: 'A',
				},
				workflow1,
			);
			const tagB = await createTag(
				{
					name: 'B',
				},
				workflow1,
			);

			await createTag({ name: 'C' }, workflow2);

			await createFolder(ownerProject, {
				name: 'First Folder',
				tags: [tagA, tagB],
				updatedAt: baseDate.plus({ minutes: 2 }).toJSDate(),
			});

			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "tags": ["A", "B"] }&includeFolders=true')
				.expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: [
					objectContaining({
						name: 'First Folder',
						tags: expect.arrayContaining([
							{ id: any(String), name: 'A' },
							{ id: any(String), name: 'B' },
						]),
					}),
					objectContaining({
						name: 'First',
						tags: expect.arrayContaining([
							{ id: any(String), name: 'A' },
							{ id: any(String), name: 'B' },
						]),
					}),
				],
			});
		});

		test('should filter workflows by projectId', async () => {
			const workflow = await createWorkflow({ name: 'First' }, owner);
			const pp = await projectRepository.getPersonalProjectForUserOrFail(owner.id);

			const folder = await createFolder(pp, {
				name: 'First Folder',
			});

			const response1 = await authOwnerAgent
				.get('/workflows')
				.query(`filter={ "projectId": "${pp.id}" }&includeFolders=true`)
				.expect(200);

			expect(response1.body.data).toHaveLength(2);
			expect(response1.body.data[0].id).toBe(folder.id);
			expect(response1.body.data[1].id).toBe(workflow.id);

			const response2 = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "projectId": "Non-Existing Project ID" }&includeFolders=true')
				.expect(200);

			expect(response2.body.data).toHaveLength(0);
		});

		test('should filter workflows by parentFolderId and its descendants when filtering by query', async () => {
			const pp = await projectRepository.getPersonalProjectForUserOrFail(owner.id);

			await createFolder(pp, {
				name: 'Root Folder 1',
			});

			const rootFolder2 = await createFolder(pp, {
				name: 'Root Folder 2',
			});

			await createFolder(pp, {
				name: 'Root Folder 3',
			});

			const subfolder1 = await createFolder(pp, {
				name: 'Root folder 2 subfolder 1 key',
				parentFolder: rootFolder2,
			});

			await createWorkflow(
				{
					name: 'Workflow 1 key',
					parentFolder: rootFolder2,
				},
				pp,
			);

			await createWorkflow(
				{
					name: 'workflow 2 key',
					parentFolder: rootFolder2,
				},
				pp,
			);

			await createWorkflow(
				{
					name: 'workflow 3 key',
					parentFolder: subfolder1,
				},
				pp,
			);

			const filter2Response = await authOwnerAgent
				.get('/workflows')
				.query(
					`filter={ "projectId": "${pp.id}", "parentFolderId": "${rootFolder2.id}", "query": "key" }&includeFolders=true`,
				);

			expect(filter2Response.body.count).toBe(4);
			expect(filter2Response.body.data).toHaveLength(4);
			expect(
				filter2Response.body.data.filter((w: WorkflowFolderUnionFull) => w.resource === 'workflow'),
			).toHaveLength(3);
			expect(
				filter2Response.body.data.filter((w: WorkflowFolderUnionFull) => w.resource === 'folder'),
			).toHaveLength(1);
		});

		test('should return homeProject when filtering workflows and folders by projectId', async () => {
			const workflow = await createWorkflow({ name: 'First' }, member);
			const pp = await getPersonalProject(member);
			const folder = await createFolder(pp, {
				name: 'First Folder',
			});

			const response = await authMemberAgent
				.get('/workflows')
				.query(`filter={ "projectId": "${pp.id}" }&includeFolders=true`)
				.expect(200);

			expect(response.body.data).toHaveLength(2);
			expect(response.body.data[0].id).toBe(folder.id);
			expect(response.body.data[0].homeProject).not.toBeNull();
			expect(response.body.data[1].id).toBe(workflow.id);
			expect(response.body.data[1].homeProject).not.toBeNull();
		});

		test('should filter workflows and folders by nodeTypes', async () => {
			const pp = await getPersonalProject(owner);

			const httpWorkflow = await createWorkflow(
				{
					name: 'HTTP Workflow',
					nodes: [
						{
							id: uuid(),
							name: 'HTTP Request',
							type: 'n8n-nodes-base.httpRequest',
							parameters: {},
							typeVersion: 1,
							position: [0, 0],
						},
					],
				},
				owner,
			);

			await createWorkflow(
				{
					name: 'Slack Workflow',
					nodes: [
						{
							id: uuid(),
							name: 'Slack',
							type: 'n8n-nodes-base.slack',
							parameters: {},
							typeVersion: 1,
							position: [0, 0],
						},
					],
				},
				owner,
			);

			const folder = await createFolder(pp, { name: 'Test Folder' });

			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "nodeTypes": ["n8n-nodes-base.httpRequest"] }&includeFolders=true')
				.expect(200);

			expect(response.body.data).toHaveLength(2); // 1 folder + 1 matching workflow
			const workflowItems = response.body.data.filter((item: any) => item.resource === 'workflow');
			const folderItems = response.body.data.filter((item: any) => item.resource === 'folder');

			expect(workflowItems).toHaveLength(1);
			expect(workflowItems[0].id).toBe(httpWorkflow.id);
			expect(folderItems).toHaveLength(1);
			expect(folderItems[0].id).toBe(folder.id);
		});
	});

	describe('sortBy', () => {
		test('should fail when trying to sort by non sortable column', async () => {
			await authOwnerAgent
				.get('/workflows')
				.query('sortBy=nonSortableColumn:asc&?includeFolders=true')
				.expect(500);
		});

		test('should sort by createdAt column', async () => {
			await createWorkflow({ name: 'First' }, owner);
			await createWorkflow({ name: 'Second' }, owner);
			const pp = await getPersonalProject(owner);
			await createFolder(pp, {
				name: 'First Folder',
			});

			await createFolder(pp, {
				name: 'Z Folder',
			});

			let response = await authOwnerAgent
				.get('/workflows')
				.query('sortBy=createdAt:asc&includeFolders=true')
				.expect(200);

			expect(response.body).toEqual({
				count: 4,
				data: arrayContaining([
					expect.objectContaining({ name: 'First Folder' }),
					expect.objectContaining({ name: 'Z Folder' }),
					expect.objectContaining({ name: 'First' }),
					expect.objectContaining({ name: 'Second' }),
				]),
			});

			response = await authOwnerAgent
				.get('/workflows')
				.query('sortBy=createdAt:asc&includeFolders=true')
				.expect(200);

			expect(response.body).toEqual({
				count: 4,
				data: arrayContaining([
					expect.objectContaining({ name: 'Z Folder' }),
					expect.objectContaining({ name: 'First Folder' }),
					expect.objectContaining({ name: 'Second' }),
					expect.objectContaining({ name: 'First' }),
				]),
			});
		});

		test('should sort by name column', async () => {
			await createWorkflow({ name: 'a' }, owner);
			await createWorkflow({ name: 'b' }, owner);
			await createWorkflow({ name: 'My workflow' }, owner);
			const pp = await getPersonalProject(owner);
			await createFolder(pp, {
				name: 'a Folder',
			});

			await createFolder(pp, {
				name: 'Z Folder',
			});

			let response;

			response = await authOwnerAgent
				.get('/workflows')
				.query('sortBy=name:asc&includeFolders=true')
				.expect(200);

			expect(response.body).toEqual({
				count: 5,
				data: [
					expect.objectContaining({ name: 'a Folder' }),
					expect.objectContaining({ name: 'Z Folder' }),
					expect.objectContaining({ name: 'a' }),
					expect.objectContaining({ name: 'b' }),
					expect.objectContaining({ name: 'My workflow' }),
				],
			});

			response = await authOwnerAgent
				.get('/workflows')
				.query('sortBy=name:desc&includeFolders=true')
				.expect(200);

			expect(response.body).toEqual({
				count: 5,
				data: [
					expect.objectContaining({ name: 'Z Folder' }),
					expect.objectContaining({ name: 'a Folder' }),
					expect.objectContaining({ name: 'My workflow' }),
					expect.objectContaining({ name: 'b' }),
					expect.objectContaining({ name: 'a' }),
				],
			});
		});

		test('should sort by updatedAt column', async () => {
			const baseDate = DateTime.now();

			const pp = await getPersonalProject(owner);
			await createFolder(pp, {
				name: 'Folder',
			});
			await createFolder(pp, {
				name: 'Z Folder',
			});
			await createWorkflow(
				{ name: 'Second', updatedAt: baseDate.plus({ minutes: 1 }).toJSDate() },
				owner,
			);
			await createWorkflow(
				{ name: 'First', updatedAt: baseDate.plus({ minutes: 2 }).toJSDate() },
				owner,
			);

			let response;

			response = await authOwnerAgent
				.get('/workflows')
				.query('sortBy=updatedAt:asc&includeFolders=true')
				.expect(200);

			expect(response.body).toEqual({
				count: 4,
				data: arrayContaining([
					expect.objectContaining({ name: 'Folder' }),
					expect.objectContaining({ name: 'Z Folder' }),
					expect.objectContaining({ name: 'Second' }),
					expect.objectContaining({ name: 'First' }),
				]),
			});

			response = await authOwnerAgent
				.get('/workflows')
				.query('sortBy=updatedAt:desc&includeFolders=true')
				.expect(200);

			expect(response.body).toEqual({
				count: 4,
				data: arrayContaining([
					expect.objectContaining({ name: 'Z Folder' }),
					expect.objectContaining({ name: 'Folder' }),
					expect.objectContaining({ name: 'First' }),
					expect.objectContaining({ name: 'Second' }),
				]),
			});
		});
	});

	describe('pagination', () => {
		beforeEach(async () => {
			const pp = await getPersonalProject(owner);
			await createWorkflow({ name: 'Workflow 1' }, owner);
			await createWorkflow({ name: 'Workflow 2' }, owner);
			await createWorkflow({ name: 'Workflow 3' }, owner);
			await createWorkflow({ name: 'Workflow 4' }, owner);
			await createWorkflow({ name: 'Workflow 5' }, owner);
			await createFolder(pp, {
				name: 'Folder 1',
			});
		});

		test('should fail when skip is provided without take', async () => {
			await authOwnerAgent.get('/workflows?includeFolders=true').query('skip=2').expect(500);
		});

		test('should handle skip with take parameter', async () => {
			const response = await authOwnerAgent
				.get('/workflows')
				.query('skip=2&take=4&includeFolders=true');

			const body = response.body as { data: WorkflowEntity[]; count: number };
			expect(body.count).toBe(6);
			expect(body.data).toHaveLength(4);
			const names = body.data.map((item) => item.name);
			expect(names).toEqual(
				expect.arrayContaining(['Workflow 2', 'Workflow 3', 'Workflow 4', 'Workflow 5']),
			);
		});

		test('should handle pagination with sorting', async () => {
			const response = await authOwnerAgent
				.get('/workflows')
				.query('skip=1&take=2&sortBy=name:desc&includeFolders=true');

			expect(response.body.data).toHaveLength(2);
			expect(response.body.count).toBe(6);
			expect(response.body.data[0].name).toBe('Workflow 5');
			expect(response.body.data[1].name).toBe('Workflow 4');
		});

		test('should handle pagination with filtering', async () => {
			const pp = await getPersonalProject(owner);
			await createWorkflow({ name: 'Special Workflow 1' }, owner);
			await createWorkflow({ name: 'Special Workflow 2' }, owner);
			await createWorkflow({ name: 'Special Workflow 3' }, owner);
			await createFolder(pp, {
				name: 'Special Folder 1',
			});

			const response = await authOwnerAgent
				.get('/workflows')
				.query('take=2&skip=1')
				.query('filter={"query":"Special"}&includeFolders=true')
				.expect(200);

			const body = response.body as { data: WorkflowEntity[]; count: number };
			expect(body.count).toBe(4);
			expect(body.data).toHaveLength(2);
			const names = body.data.map((item) => item.name);
			expect(names).toEqual(expect.arrayContaining(['Special Workflow 1', 'Special Workflow 2']));
		});

		test('should return empty array when pagination exceeds total count', async () => {
			const response = await authOwnerAgent
				.get('/workflows')
				.query('take=2&skip=10&includeFolders=true')
				.expect(200);

			expect(response.body.data).toHaveLength(0);
			expect(response.body.count).toBe(6);
		});

		test('should return all results when no pagination parameters are provided', async () => {
			const response = await authOwnerAgent
				.get('/workflows')
				.query('includeFolders=true')
				.expect(200);

			expect(response.body.data).toHaveLength(6);
			expect(response.body.count).toBe(6);
		});
	});
});

describe('PATCH /workflows/:workflowId', () => {
	test('should always create workflow history version', async () => {
		const workflow = await createWorkflowWithHistory({}, owner);
		const payload = {
			name: 'name updated',
			versionId: workflow.versionId,
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
				timeSavedMode: 'fixed',
				timeSavedPerExecution: 10,
			},
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		const {
			data: { id, versionId: updatedVersionId },
		} = response.body;

		expect(response.statusCode).toBe(200);
		expect(response.body.data.settings.timeSavedMode).toBe('fixed');
		expect(response.body.data.settings.timeSavedPerExecution).toBe(10);

		expect(id).toBe(workflow.id);
		expect(await workflowHistoryRepository.count({ where: { workflowId: id } })).toBe(2);
		const historyVersion = await workflowHistoryRepository.findOne({
			where: {
				workflowId: id,
				versionId: updatedVersionId,
			},
		});
		expect(historyVersion).not.toBeNull();
		expect(historyVersion!.connections).toEqual(payload.connections);
		expect(historyVersion!.nodes).toEqual(payload.nodes);
	});

	test('should update the version counter', async () => {
		const workflow = await createWorkflow({}, owner);
		const payload = {
			name: 'name updated',
			versionId: workflow.versionId,
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const {
			data: { id, versionCounter },
		} = response.body;

		expect(response.statusCode).toBe(200);

		expect(id).toBe(workflow.id);
		expect(versionCounter).toBe(workflow.versionCounter + 1);
	});

	test('should activate workflow without changing version ID', async () => {
		const workflow = await createWorkflowWithHistory({}, owner);
		const payload = {
			versionId: workflow.versionId,
			active: true,
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		expect(response.statusCode).toBe(200);
		expect(activeWorkflowManagerLike.add).toBeCalled();

		const {
			data: { id, versionId, active, activeVersionId },
		} = response.body;

		expect(id).toBe(workflow.id);
		expect(versionId).toBe(workflow.versionId);
		expect(active).toBe(true);
		expect(activeVersionId).toBe(workflow.versionId);
	});

	test('should deactivate workflow without changing version ID', async () => {
		const workflow = await createActiveWorkflow({}, owner);
		const payload = {
			versionId: workflow.versionId,
			active: false,
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		expect(response.statusCode).toBe(200);
		expect(activeWorkflowManagerLike.add).not.toBeCalled();
		expect(activeWorkflowManagerLike.remove).toBeCalled();

		const {
			data: { id, versionId, active, activeVersionId },
		} = response.body;

		expect(id).toBe(workflow.id);
		expect(versionId).toBe(workflow.versionId);
		expect(active).toBe(false);
		expect(activeVersionId).toBeNull();
	});

	test('should set activeVersionId when activating via PATCH', async () => {
		const workflow = await createWorkflowWithTriggerAndHistory({}, owner);

		const payload = {
			versionId: workflow.versionId,
			active: true,
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		expect(response.statusCode).toBe(200);
		expect(activeWorkflowManagerLike.add).toBeCalled();

		const {
			data: { id, activeVersionId },
		} = response.body;

		expect(id).toBe(workflow.id);
		expect(activeVersionId).toBe(workflow.versionId);

		// Verify activeVersion is set
		const updatedWorkflow = await workflowRepository.findOne({
			where: { id: workflow.id },
			relations: ['activeVersion'],
		});

		expect(updatedWorkflow?.activeVersionId).toBe(workflow.versionId);
		expect(updatedWorkflow?.activeVersion).not.toBeNull();
		expect(updatedWorkflow?.activeVersion?.versionId).toBe(workflow.versionId);
		expect(updatedWorkflow?.activeVersion?.nodes).toEqual(workflow.nodes);
		expect(updatedWorkflow?.activeVersion?.connections).toEqual(workflow.connections);
	});

	test('should clear activeVersionId when deactivating via PATCH', async () => {
		const workflow = await createActiveWorkflow({}, owner);

		await setActiveVersion(workflow.id, workflow.versionId);

		const payload = {
			versionId: workflow.versionId,
			active: false,
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		expect(response.statusCode).toBe(200);
		expect(activeWorkflowManagerLike.remove).toBeCalled();

		const {
			data: { id, activeVersionId },
		} = response.body;

		expect(id).toBe(workflow.id);
		expect(activeVersionId).toBeNull();

		// Verify activeVersion is cleared
		const updatedWorkflow = await workflowRepository.findOne({
			where: { id: workflow.id },
		});

		expect(updatedWorkflow?.activeVersionId).toBeNull();
	});

	test('should update activeVersionId when updating an active workflow', async () => {
		const workflow = await createActiveWorkflow({}, owner);

		await setActiveVersion(workflow.id, workflow.versionId);

		// Verify initial state
		const initialWorkflow = await workflowRepository.findOne({
			where: { id: workflow.id },
			relations: ['activeVersion'],
		});
		expect(initialWorkflow?.activeVersion?.versionId).toBe(workflow.versionId);

		// Update workflow nodes
		const updatedNodes: INode[] = [
			{
				id: 'uuid-updated',
				parameters: { triggerTimes: { item: [{ mode: 'everyHour' }] } },
				name: 'Cron Updated',
				type: 'n8n-nodes-base.cron',
				typeVersion: 1,
				position: [500, 400],
			},
		];

		const payload = {
			versionId: workflow.versionId,
			nodes: updatedNodes,
			connections: {},
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		expect(response.statusCode).toBe(200);

		const {
			data: { id, versionId: newVersionId },
		} = response.body;

		expect(id).toBe(workflow.id);
		expect(newVersionId).not.toBe(workflow.versionId);

		// Verify activeVersion points to the new version
		const updatedWorkflow = await workflowRepository.findOne({
			where: { id: workflow.id },
			relations: ['activeVersion'],
		});

		expect(updatedWorkflow?.active).toBe(true);
		expect(updatedWorkflow?.activeVersionId).not.toBeNull();
		expect(updatedWorkflow?.activeVersion?.versionId).toBe(newVersionId);
		expect(updatedWorkflow?.activeVersion?.nodes).toEqual(updatedNodes);
	});

	test('should update workflow meta', async () => {
		const workflow = await createWorkflow({}, owner);
		const payload = {
			...workflow,
			meta: {
				templateCredsSetupCompleted: true,
			},
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		const { data: updatedWorkflow } = response.body;

		expect(response.statusCode).toBe(200);

		expect(updatedWorkflow.id).toBe(workflow.id);
		expect(updatedWorkflow.meta).toEqual(payload.meta);
	});

	test('should move workflow to folder', async () => {
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const folder1 = await createFolder(ownerPersonalProject, { name: 'folder1' });

		const workflow = await createWorkflow({}, owner);
		const payload = {
			versionId: workflow.versionId,
			parentFolderId: folder1.id,
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		expect(response.statusCode).toBe(200);

		const updatedWorkflow = await workflowRepository.findOneOrFail({
			where: { id: workflow.id },
			relations: ['parentFolder'],
		});

		expect(updatedWorkflow.parentFolder?.id).toBe(folder1.id);
	});

	test('should move workflow to project root', async () => {
		const workflow = await createWorkflow({}, owner);
		const payload = {
			versionId: workflow.versionId,
			parentFolderId: PROJECT_ROOT,
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		expect(response.statusCode).toBe(200);

		const updatedWorkflow = await workflowRepository.findOneOrFail({
			where: { id: workflow.id },
			relations: ['parentFolder'],
		});

		expect(updatedWorkflow.parentFolder).toBe(null);
	});

	test('should fail if an invalid timeSavedMode is provided', async () => {
		const workflow = await createWorkflow({}, owner);
		const payload = {
			name: 'name updated',
			versionId: workflow.versionId,
			settings: {
				timeSavedMode: 'invalid' as 'fixed' | 'dynamic',
			},
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe('Invalid timeSavedMode');
	});

	test('should fail if trying update workflow parent folder with a folder that does not belong to project', async () => {
		const ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
		const memberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			member.id,
		);

		await createFolder(ownerPersonalProject, { name: 'folder1' });
		const folder2 = await createFolder(memberPersonalProject, { name: 'folder2' });

		const workflow = await createWorkflow({}, owner);
		const payload = {
			versionId: workflow.versionId,
			parentFolderId: folder2.id,
		};

		const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

		expect(response.statusCode).toBe(500);
	});

	describe('with draft/publish feature enabled', () => {
		beforeEach(() => {
			globalConfig.workflows.draftPublishEnabled = true;
		});

		afterEach(() => {
			globalConfig.workflows.draftPublishEnabled = false;
		});

		test('should not update activeVersionId when updating with active: true', async () => {
			const workflow = await createWorkflow({}, owner);
			const payload = {
				versionId: workflow.versionId,
				active: true,
			};

			const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

			expect(response.statusCode).toBe(200);
			expect(activeWorkflowManagerLike.add).not.toBeCalled();

			const { data } = response.body;
			expect(data.activeVersionId).toBeNull();
		});

		test('should not deactivate workflow when updating with active: false', async () => {
			const workflow = await createActiveWorkflow({}, owner);
			await setActiveVersion(workflow.id, workflow.versionId);

			const payload = {
				versionId: workflow.versionId,
				active: false,
			};

			const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

			expect(response.statusCode).toBe(200);
			expect(activeWorkflowManagerLike.remove).not.toBeCalled();

			const { data } = response.body;
			expect(data.activeVersionId).toBe(workflow.versionId);
		});

		test('should NOT write "active" field to database when updating with active: true', async () => {
			const workflow = await createWorkflowWithHistory({}, owner);
			const payload = {
				versionId: workflow.versionId,
				active: true,
			};

			const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

			expect(response.statusCode).toBe(200);

			const updatedWorkflow = await workflowRepository.findOne({
				where: { id: workflow.id },
			});

			expect(updatedWorkflow?.active).toBe(false);
			expect(updatedWorkflow?.activeVersionId).toBeNull();
		});

		test('should NOT write "active" field to database when updating with active: false', async () => {
			const workflow = await createActiveWorkflow({}, owner);
			const payload = {
				versionId: workflow.versionId,
				active: false,
			};

			const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

			expect(response.statusCode).toBe(200);

			const updatedWorkflow = await workflowRepository.findOne({
				where: { id: workflow.id },
			});

			expect(updatedWorkflow?.active).toBe(true);
			expect(updatedWorkflow?.activeVersionId).toBe(workflow.activeVersionId);
		});

		test('should not modify activeVersionId when explicitly provided', async () => {
			const workflow = await createWorkflowWithHistory({}, owner);
			const payload = {
				versionId: workflow.versionId,
				activeVersionId: workflow.versionId,
			};

			const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

			expect(response.statusCode).toBe(200);
			expect(activeWorkflowManagerLike.add).not.toBeCalled();

			const { data } = response.body;
			expect(data.activeVersionId).toBeNull(); // Should not be activated
		});

		test('should allow updating active workflow without updating its active version', async () => {
			const workflow = await createActiveWorkflow({}, owner);
			await setActiveVersion(workflow.id, workflow.versionId);

			const payload = {
				name: 'Updated Active Workflow',
				versionId: workflow.versionId,
			};

			const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

			expect(response.statusCode).toBe(200);
			expect(activeWorkflowManagerLike.remove).not.toBeCalled();
			expect(activeWorkflowManagerLike.add).not.toBeCalled();

			const { data } = response.body;
			expect(data.name).toBe('Updated Active Workflow');
			expect(data.versionId).not.toBe(workflow.versionId); // New version created
			expect(data.activeVersionId).toBe(workflow.versionId); // Should remain active
		});
	});
});

describe('POST /workflows/:workflowId/activate', () => {
	test('should activate workflow with provided versionId', async () => {
		const workflow = await createWorkflowWithHistory({}, owner);

		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: workflow.versionId });

		expect(response.statusCode).toBe(200);
		expect(activeWorkflowManagerLike.add).toBeCalledWith(workflow.id, 'activate');

		const { data } = response.body;
		expect(data.id).toBe(workflow.id);
		expect(data.activeVersionId).toBe(workflow.versionId);
		expect(data.activeVersion.versionId).toBe(workflow.versionId);
	});

	test('should send activated event', async () => {
		const workflow = await createWorkflowWithHistory({}, owner);

		const emitSpy = jest.spyOn(eventService, 'emit');
		await authOwnerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: workflow.versionId });

		expect(emitSpy).toHaveBeenCalledWith('workflow-activated', expect.anything());
	});

	test('should return 400 when versionId is missing', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent.post(`/workflows/${workflow.id}/activate`).send({});

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toContain('versionId is required');
	});

	test('should return 404 when workflow does not exist', async () => {
		const response = await authOwnerAgent
			.post('/workflows/non-existent-id/activate')
			.send({ versionId: uuid() });

		expect(response.statusCode).toBe(404);
	});

	test('should return 403 when user does not have update permission', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authMemberAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: workflow.versionId });

		expect(response.statusCode).toBe(403);
	});

	test('should set activeVersion relation when activating', async () => {
		const workflow = await createWorkflowWithHistory({}, owner);

		await authOwnerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: workflow.versionId });

		const updatedWorkflow = await workflowRepository.findOne({
			where: { id: workflow.id },
			relations: ['activeVersion'],
		});

		expect(updatedWorkflow?.activeVersionId).toBe(workflow.versionId);
		expect(updatedWorkflow?.activeVersion).not.toBeNull();
		expect(updatedWorkflow?.activeVersion?.versionId).toBe(workflow.versionId);
	});

	describe('with draft/publish feature enabled', () => {
		beforeEach(() => {
			globalConfig.workflows.draftPublishEnabled = true;
		});

		afterEach(() => {
			globalConfig.workflows.draftPublishEnabled = false;
		});

		test('should activate workflow with provided versionId', async () => {
			const workflow = await createWorkflowWithHistory({}, owner);
			const newVersionId = uuid();
			await createWorkflowHistoryItem(workflow.id, { versionId: newVersionId });

			const response = await authOwnerAgent
				.post(`/workflows/${workflow.id}/activate`)
				.send({ versionId: newVersionId });

			expect(response.statusCode).toBe(200);
			expect(activeWorkflowManagerLike.add).toBeCalledWith(workflow.id, 'activate');

			const { data } = response.body;
			expect(data.id).toBe(workflow.id);
			expect(data.activeVersionId).toBe(newVersionId);
			expect(data.activeVersion.versionId).toBe(newVersionId);
		});

		test('should update version name when provided during activation', async () => {
			const workflow = await createWorkflowWithHistory({}, owner);
			const newVersionName = 'Production Version';

			const response = await authOwnerAgent
				.post(`/workflows/${workflow.id}/activate`)
				.send({ versionId: workflow.versionId, name: newVersionName });

			expect(response.statusCode).toBe(200);
			expect(activeWorkflowManagerLike.add).toBeCalledWith(workflow.id, 'activate');

			const { data } = response.body;
			expect(data.activeVersionId).toBe(workflow.versionId);

			const historyVersion = await workflowHistoryRepository.findOne({
				where: { workflowId: workflow.id, versionId: workflow.versionId },
			});

			expect(historyVersion?.name).toBe(newVersionName);
		});

		test('should update version description when provided during activation', async () => {
			const workflow = await createWorkflowWithHistory({}, owner);
			const newDescription = 'This is the stable production release';

			const response = await authOwnerAgent
				.post(`/workflows/${workflow.id}/activate`)
				.send({ versionId: workflow.versionId, description: newDescription });

			expect(response.statusCode).toBe(200);
			expect(activeWorkflowManagerLike.add).toBeCalledWith(workflow.id, 'activate');

			const { data } = response.body;
			expect(data.activeVersionId).toBe(workflow.versionId);

			const historyVersion = await workflowHistoryRepository.findOne({
				where: { workflowId: workflow.id, versionId: workflow.versionId },
			});

			expect(historyVersion?.description).toBe(newDescription);
		});

		test('should update both version name and description when provided during activation', async () => {
			const workflow = await createWorkflowWithHistory({}, owner);
			const newVersionName = 'Production Version';
			const newDescription = 'Major update with new features';

			const response = await authOwnerAgent.post(`/workflows/${workflow.id}/activate`).send({
				versionId: workflow.versionId,
				name: newVersionName,
				description: newDescription,
			});

			expect(response.statusCode).toBe(200);
			expect(activeWorkflowManagerLike.add).toBeCalledWith(workflow.id, 'activate');

			const { data } = response.body;
			expect(data.activeVersionId).toBe(workflow.versionId);

			const historyVersion = await workflowHistoryRepository.findOne({
				where: { workflowId: workflow.id, versionId: workflow.versionId },
			});

			expect(historyVersion?.name).toBe(newVersionName);
			expect(historyVersion?.description).toBe(newDescription);
		});

		test('should not update version name and description when activation fails', async () => {
			const workflow = await createWorkflowWithHistory({}, owner);
			const newVersionName = 'Production Version';
			const newDescription = 'Major update with new features';

			activeWorkflowManagerLike.add.mockRejectedValueOnce(new Error('Validation failed'));

			await authOwnerAgent.post(`/workflows/${workflow.id}/activate`).send({
				versionId: workflow.versionId,
				name: newVersionName,
				description: newDescription,
			});

			const updatedVersion = await workflowHistoryRepository.findOne({
				where: { versionId: workflow.versionId },
			});

			expect(updatedVersion?.name).toBeNull();
			expect(updatedVersion?.description).toBeNull();
		});

		test('should preserve current active version when activation fails', async () => {
			const workflow = await createActiveWorkflow({}, owner);

			const newVersionId = uuid();
			await createWorkflowHistoryItem(workflow.id, { versionId: newVersionId });

			const emitSpy = jest.spyOn(eventService, 'emit');

			activeWorkflowManagerLike.add.mockRejectedValueOnce(new Error('Validation failed'));

			const response = await authOwnerAgent
				.post(`/workflows/${workflow.id}/activate`)
				.send({ versionId: newVersionId });

			expect(response.statusCode).toBe(400);
			expect(response.body.message).toBe('Validation failed');

			const updatedWorkflow = await workflowRepository.findOne({
				where: { id: workflow.id },
				relations: ['activeVersion'],
			});

			expect(updatedWorkflow?.active).toBe(true);
			expect(updatedWorkflow?.activeVersionId).toBe(workflow.versionId);
			expect(updatedWorkflow?.activeVersion?.versionId).toBe(workflow.versionId);

			expect(emitSpy).not.toHaveBeenCalledWith('workflow-deactivated', expect.anything());
		});

		test('should call active workflow manager with update mode if workflow is active', async () => {
			const workflow = await createActiveWorkflow({}, owner);

			const newVersionId = uuid();
			await createWorkflowHistoryItem(workflow.id, { versionId: newVersionId });

			await authOwnerAgent
				.post(`/workflows/${workflow.id}/activate`)
				.send({ versionId: newVersionId });

			expect(activeWorkflowManagerLike.add).toBeCalledWith(workflow.id, 'update');
		});
	});

	test('should ignore version id, name and description', async () => {
		const workflow = await createWorkflowWithHistory({}, owner);
		const newVersionId = uuid();
		const newVersionName = 'Production Version';
		const newDescription = 'Major update with new features';

		const response = await authOwnerAgent.post(`/workflows/${workflow.id}/activate`).send({
			versionId: newVersionId,
			name: newVersionName,
			description: newDescription,
		});

		const { data } = response.body;
		expect(data.activeVersionId).toBe(workflow.versionId);

		const historyVersion = await workflowHistoryRepository.findOne({
			where: { workflowId: workflow.id, versionId: workflow.versionId },
		});

		expect(historyVersion?.name).toBeNull();
		expect(historyVersion?.description).toBeNull();
	});

	test('should call active workflow manager with activate mode if workflow is not active', async () => {
		const workflow = await createWorkflowWithHistory({}, owner);

		await authOwnerAgent
			.post(`/workflows/${workflow.id}/activate`)
			.send({ versionId: workflow.versionId });

		expect(activeWorkflowManagerLike.add).toBeCalledWith(workflow.id, 'activate');
	});
});

describe('POST /workflows/:workflowId/deactivate', () => {
	test('should deactivate active workflow', async () => {
		const workflow = await createActiveWorkflow({}, owner);

		const response = await authOwnerAgent.post(`/workflows/${workflow.id}/deactivate`);

		expect(response.statusCode).toBe(200);
		expect(activeWorkflowManagerLike.remove).toBeCalledWith(workflow.id);

		const { data } = response.body;
		expect(data.id).toBe(workflow.id);
		expect(data.active).toBe(false);
		expect(data.activeVersionId).toBeNull();
	});

	test('should send deactivated event', async () => {
		const workflow = await createActiveWorkflow({}, owner);

		const emitSpy = jest.spyOn(eventService, 'emit');
		await authOwnerAgent.post(`/workflows/${workflow.id}/deactivate`);

		expect(emitSpy).toHaveBeenCalledWith('workflow-deactivated', expect.anything());
	});

	test('should handle deactivating already inactive workflow', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent.post(`/workflows/${workflow.id}/deactivate`);

		expect(response.statusCode).toBe(200);
		expect(activeWorkflowManagerLike.remove).not.toBeCalled();

		const { data } = response.body;
		expect(data.activeVersionId).toBeNull();
	});

	test('should return 404 when workflow does not exist', async () => {
		const response = await authOwnerAgent.post('/workflows/non-existent-id/deactivate');

		expect(response.statusCode).toBe(404);
	});

	test('should return 403 when user does not have update permission', async () => {
		const workflow = await createActiveWorkflow({}, owner);

		const response = await authMemberAgent.post(`/workflows/${workflow.id}/deactivate`);

		expect(response.statusCode).toBe(403);
	});

	test('should clear activeVersion relation when deactivating', async () => {
		const workflow = await createActiveWorkflow({}, owner);
		await setActiveVersion(workflow.id, workflow.versionId);

		await authOwnerAgent.post(`/workflows/${workflow.id}/deactivate`);

		const updatedWorkflow = await workflowRepository.findOne({
			where: { id: workflow.id },
			relations: ['activeVersion'],
		});

		expect(updatedWorkflow?.activeVersionId).toBeNull();
		expect(updatedWorkflow?.activeVersion).toBeNull();
	});
});

describe('POST /workflows/:workflowId/run', () => {
	let sharingSpy: jest.SpyInstance;
	let tamperingSpy: jest.SpyInstance;
	let workflow: IWorkflowBase;

	beforeAll(() => {
		const enterpriseWorkflowService = Container.get(EnterpriseWorkflowService);

		sharingSpy = jest.spyOn(License.prototype, 'isSharingEnabled');
		tamperingSpy = jest.spyOn(enterpriseWorkflowService, 'preventTampering');
		workflow = workflowRepository.create({ id: uuid() });
	});

	test('should prevent tampering if sharing is enabled', async () => {
		sharingSpy.mockReturnValue(true);

		await authOwnerAgent.post(`/workflows/${workflow.id}/run`).send({ workflowData: workflow });

		expect(tamperingSpy).toHaveBeenCalledTimes(1);
	});

	test('should skip tampering prevention if sharing is disabled', async () => {
		sharingSpy.mockReturnValue(false);

		await authOwnerAgent.post(`/workflows/${workflow.id}/run`).send({ workflowData: workflow });

		expect(tamperingSpy).not.toHaveBeenCalled();
	});
});

describe('POST /workflows/:workflowId/archive', () => {
	test('should archive workflow', async () => {
		const workflow = await createWorkflow({}, owner);
		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/archive`)
			.send()
			.expect(200);

		const {
			data: { isArchived, versionId, active },
		} = response.body;

		expect(isArchived).toBe(true);
		expect(versionId).not.toBe(workflow.versionId);
		expect(active).toBe(false);

		const updatedWorkflow = await workflowRepository.findById(workflow.id);
		expect(updatedWorkflow).not.toBeNull();
		expect(updatedWorkflow!.isArchived).toBe(true);
	});

	test('should deactivate active workflow on archive', async () => {
		const workflow = await createActiveWorkflow({}, owner);
		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/archive`)
			.send()
			.expect(200);

		const {
			data: { isArchived, versionId, activeVersionId, active },
		} = response.body;

		expect(isArchived).toBe(true);
		expect(activeVersionId).toBeNull();
		expect(active).toBe(false);
		expect(versionId).not.toBe(workflow.versionId);
		expect(activeWorkflowManagerLike.remove).toBeCalledWith(workflow.id);

		const updatedWorkflow = await workflowRepository.findById(workflow.id);
		expect(updatedWorkflow).not.toBeNull();
		expect(updatedWorkflow!.isArchived).toBe(true);
	});

	test('should not archive workflow that is already archived', async () => {
		const workflow = await createWorkflow({ isArchived: true }, owner);
		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/archive`)
			.send()
			.expect(400);

		expect(response.body.message).toBe('Workflow is already archived.');

		const updatedWorkflow = await workflowRepository.findById(workflow.id);
		expect(updatedWorkflow).not.toBeNull();
		expect(updatedWorkflow!.isArchived).toBe(true);
	});

	test('should not archive missing workflow', async () => {
		const response = await authOwnerAgent.post('/workflows/404/archive').send().expect(403);
		expect(response.body.message).toBe(
			'Could not archive the workflow - workflow was not found in your projects',
		);
	});

	test('should not archive a workflow that is not owned by the user', async () => {
		const workflow = await createWorkflow({ isArchived: false }, member);

		await testServer
			.authAgentFor(anotherMember)
			.post(`/workflows/${workflow.id}/archive`)
			.send()
			.expect(403);

		const workflowsInDb = await workflowRepository.findById(workflow.id);
		const sharedWorkflowsInDb = await Container.get(SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});

		expect(workflowsInDb).not.toBeNull();
		expect(workflowsInDb!.isArchived).toBe(false);
		expect(sharedWorkflowsInDb).toHaveLength(1);
	});

	test("should allow the owner to archive workflows they don't own", async () => {
		const workflow = await createWorkflow({ isArchived: false }, member);

		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/archive`)
			.send()
			.expect(200);

		const {
			data: { isArchived, versionId },
		} = response.body;

		expect(isArchived).toBe(true);
		expect(versionId).not.toBe(workflow.versionId);

		const workflowsInDb = await workflowRepository.findById(workflow.id);
		const sharedWorkflowsInDb = await Container.get(SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});

		expect(workflowsInDb).not.toBeNull();
		expect(workflowsInDb!.isArchived).toBe(true);
		expect(sharedWorkflowsInDb).toHaveLength(1);
	});

	test('should save workflow history', async () => {
		const workflow = await createWorkflowWithHistory({}, owner);
		const initialVersionId = workflow.versionId;

		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/archive`)
			.send()
			.expect(200);

		const {
			data: { versionId: newVersionId },
		} = response.body;

		expect(newVersionId).not.toBe(initialVersionId);

		const historyRecord = await workflowHistoryRepository.findOne({
			where: {
				workflowId: workflow.id,
				versionId: newVersionId,
			},
		});

		expect(historyRecord).not.toBeNull();
		expect(historyRecord!.nodes).toEqual(workflow.nodes);
		expect(historyRecord!.connections).toEqual(workflow.connections);
	});
});

describe('POST /workflows/:workflowId/unarchive', () => {
	test('should unarchive workflow', async () => {
		const workflow = await createWorkflow({ isArchived: true }, owner);
		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/unarchive`)
			.send()
			.expect(200);

		const {
			data: { isArchived, versionId },
		} = response.body;

		expect(isArchived).toBe(false);
		expect(versionId).not.toBe(workflow.versionId);

		const updatedWorkflow = await workflowRepository.findById(workflow.id);
		expect(updatedWorkflow).not.toBeNull();
		expect(updatedWorkflow!.isArchived).toBe(false);
	});

	test('should not unarchive workflow that is already not archived', async () => {
		const workflow = await createWorkflow({ isArchived: false }, owner);
		await authOwnerAgent.post(`/workflows/${workflow.id}/unarchive`).send().expect(400);

		const updatedWorkflow = await workflowRepository.findById(workflow.id);
		expect(updatedWorkflow).not.toBeNull();
		expect(updatedWorkflow!.isArchived).toBe(false);
	});

	test('should not unarchive missing workflow', async () => {
		const response = await authOwnerAgent.post('/workflows/404/unarchive').send().expect(403);
		expect(response.body.message).toBe(
			'Could not unarchive the workflow - workflow was not found in your projects',
		);
	});

	test('should not unarchive a workflow that is not owned by the user', async () => {
		const workflow = await createWorkflow({ isArchived: true }, member);

		await testServer
			.authAgentFor(anotherMember)
			.post(`/workflows/${workflow.id}/unarchive`)
			.send()
			.expect(403);

		const workflowsInDb = await workflowRepository.findById(workflow.id);
		const sharedWorkflowsInDb = await Container.get(SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});

		expect(workflowsInDb).not.toBeNull();
		expect(workflowsInDb!.isArchived).toBe(true);
		expect(sharedWorkflowsInDb).toHaveLength(1);
	});

	test("should allow the owner to unarchive workflows they don't own", async () => {
		const workflow = await createWorkflow({ isArchived: true }, member);

		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/unarchive`)
			.send()
			.expect(200);

		const {
			data: { isArchived, versionId },
		} = response.body;

		expect(isArchived).toBe(false);
		expect(versionId).not.toBe(workflow.versionId);

		const workflowsInDb = await workflowRepository.findById(workflow.id);
		const sharedWorkflowsInDb = await Container.get(SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});

		expect(workflowsInDb).not.toBeNull();
		expect(workflowsInDb!.isArchived).toBe(false);
		expect(sharedWorkflowsInDb).toHaveLength(1);
	});

	test('should save workflow history', async () => {
		const workflow = await createWorkflowWithHistory({ isArchived: true }, owner);
		const initialVersionId = workflow.versionId;

		const response = await authOwnerAgent
			.post(`/workflows/${workflow.id}/unarchive`)
			.send()
			.expect(200);

		const {
			data: { versionId: newVersionId },
		} = response.body;

		expect(newVersionId).not.toBe(initialVersionId);

		const historyRecord = await workflowHistoryRepository.findOne({
			where: {
				workflowId: workflow.id,
				versionId: newVersionId,
			},
		});

		expect(historyRecord).not.toBeNull();
		expect(historyRecord!.nodes).toEqual(workflow.nodes);
		expect(historyRecord!.connections).toEqual(workflow.connections);
	});

	test('should be able to activate workflow after unarchiving', async () => {
		const workflow = await createWorkflowWithHistory(
			{
				nodes: [
					{
						id: 'trigger-1',
						parameters: {},
						name: 'Schedule Trigger',
						type: 'n8n-nodes-base.scheduleTrigger',
						typeVersion: 1,
						position: [240, 300],
					},
				],
				connections: {},
			},
			owner,
		);

		await authOwnerAgent.post(`/workflows/${workflow.id}/archive`).send().expect(200);

		const unarchiveResponse = await authOwnerAgent
			.post(`/workflows/${workflow.id}/unarchive`)
			.send()
			.expect(200);

		const { data: unarchivedWorkflow } = unarchiveResponse.body;

		const activateResponse = await authOwnerAgent
			.patch(`/workflows/${workflow.id}`)
			.send({ active: true, versionId: unarchivedWorkflow.versionId })
			.expect(200);

		expect(activateResponse.body.data.active).toBe(true);
		expect(activateResponse.body.data.activeVersionId).toBeDefined();
	});
});

describe('DELETE /workflows/:workflowId', () => {
	test('deletes an archived workflow owned by the user', async () => {
		const workflow = await createWorkflow({ isArchived: true }, owner);

		await authOwnerAgent.delete(`/workflows/${workflow.id}`).send().expect(200);

		const workflowInDb = await workflowRepository.findById(workflow.id);
		const sharedWorkflowsInDb = await Container.get(SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});

		expect(workflowInDb).toBeNull();
		expect(sharedWorkflowsInDb).toHaveLength(0);
	});

	test('should not delete missing workflow', async () => {
		const response = await authOwnerAgent.delete('/workflows/404').send().expect(403);
		expect(response.body.message).toBe(
			'Could not delete the workflow - workflow was not found in your projects',
		);
	});

	test('deletes an archived workflow owned by the user, even if the user is just a member', async () => {
		const workflow = await createWorkflow({ isArchived: true }, member);

		await testServer.authAgentFor(member).delete(`/workflows/${workflow.id}`).send().expect(200);

		const workflowInDb = await workflowRepository.findById(workflow.id);
		const sharedWorkflowsInDb = await Container.get(SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});

		expect(workflowInDb).toBeNull();
		expect(sharedWorkflowsInDb).toHaveLength(0);
	});

	test('does not delete a workflow that is not archived', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent.delete(`/workflows/${workflow.id}`).send().expect(400);
		expect(response.body.message).toBe('Workflow must be archived before it can be deleted.');

		const workflowInDb = await workflowRepository.findById(workflow.id);
		const sharedWorkflowsInDb = await Container.get(SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});

		expect(workflowInDb).not.toBeNull();
		expect(sharedWorkflowsInDb).toHaveLength(1);
	});

	test('does not delete an archived workflow that is not owned by the user', async () => {
		const workflow = await createWorkflow({ isArchived: true }, member);

		await testServer
			.authAgentFor(anotherMember)
			.delete(`/workflows/${workflow.id}`)
			.send()
			.expect(403);

		const workflowsInDb = await workflowRepository.findById(workflow.id);
		const sharedWorkflowsInDb = await Container.get(SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});

		expect(workflowsInDb).not.toBeNull();
		expect(sharedWorkflowsInDb).toHaveLength(1);
	});

	test("allows the owner to delete archived workflows they don't own", async () => {
		const workflow = await createWorkflow({ isArchived: true }, member);

		await authOwnerAgent.delete(`/workflows/${workflow.id}`).send().expect(200);

		const workflowsInDb = await workflowRepository.findById(workflow.id);
		const sharedWorkflowsInDb = await Container.get(SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});

		expect(workflowsInDb).toBeNull();
		expect(sharedWorkflowsInDb).toHaveLength(0);
	});
});

describe('GET /workflows/:workflowId/executions/last-successful', () => {
	test('should return the last successful execution', async () => {
		const workflow = await createWorkflow({}, owner);

		const { createSuccessfulExecution } = await import('../shared/db/executions');

		// Create multiple executions with different statuses
		await createSuccessfulExecution(workflow);
		const lastExecution = await createSuccessfulExecution(workflow);

		const response = await authOwnerAgent
			.get(`/workflows/${workflow.id}/executions/last-successful`)
			.expect(200);

		expect(response.body.data).toMatchObject({
			id: lastExecution.id,
			workflowId: workflow.id,
		});
	});

	test('should return 404 when no successful execution exists', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent
			.get(`/workflows/${workflow.id}/executions/last-successful`)
			.expect(404);

		expect(response.body.message).toBe('No successful execution found for the workflow');
	});
});
