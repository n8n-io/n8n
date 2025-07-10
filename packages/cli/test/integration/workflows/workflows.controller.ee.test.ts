import {
	createTeamProject,
	getPersonalProject,
	linkUserToProject,
	createWorkflow,
	getWorkflowSharing,
	shareWorkflowWithProjects,
	shareWorkflowWithUsers,
	randomCredentialPayload,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { Project, User, WorkflowWithSharingsMetaDataAndCredentials } from '@n8n/db';
import {
	ProjectRepository,
	WorkflowHistoryRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { ProjectRole } from '@n8n/permissions';
import { ApplicationError, WorkflowActivationError, type INode } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import config from '@/config';
import { UserManagementMailer } from '@/user-management/email';
import { createFolder } from '@test-integration/db/folders';

import {
	affixRoleToSaveCredential,
	getCredentialSharings,
	shareCredentialWithProjects,
	shareCredentialWithUsers,
} from '../shared/db/credentials';
import { createTag } from '../shared/db/tags';
import { createAdmin, createOwner, createUser, createUserShell } from '../shared/db/users';
import type { SaveCredentialFunction, SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils/';
import { makeWorkflow } from '../shared/utils/';

let owner: User;
let admin: User;
let ownerPersonalProject: Project;
let member: User;
let memberPersonalProject: Project;
let anotherMember: User;
let anotherMemberPersonalProject: Project;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let authAnotherMemberAgent: SuperAgentTest;
let saveCredential: SaveCredentialFunction;

let projectRepository: ProjectRepository;
let workflowRepository: WorkflowRepository;

const activeWorkflowManager = mockInstance(ActiveWorkflowManager);

const testServer = utils.setupTestServer({
	endpointGroups: ['workflows'],
	enabledFeatures: ['feat:sharing', 'feat:advancedPermissions'],
});
const license = testServer.license;
const mailer = mockInstance(UserManagementMailer);

beforeAll(async () => {
	projectRepository = Container.get(ProjectRepository);
	workflowRepository = Container.get(WorkflowRepository);

	owner = await createOwner();
	admin = await createAdmin();
	ownerPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(owner.id);
	member = await createUser({ role: 'global:member' });
	memberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(member.id);
	anotherMember = await createUser({ role: 'global:member' });
	anotherMemberPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
		anotherMember.id,
	);

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
	authAnotherMemberAgent = testServer.authAgentFor(anotherMember);

	saveCredential = affixRoleToSaveCredential('credential:owner');

	await utils.initNodeTypes();
});

beforeEach(async () => {
	activeWorkflowManager.add.mockReset();
	activeWorkflowManager.remove.mockReset();

	await testDb.truncate(['WorkflowEntity', 'SharedWorkflow', 'WorkflowHistory', 'TagEntity']);
});

afterEach(() => {
	jest.clearAllMocks();
});

describe('router should switch based on flag', () => {
	let savedWorkflowId: string;

	beforeEach(async () => {
		const createWorkflowResponse = await authOwnerAgent.post('/workflows').send(makeWorkflow());
		savedWorkflowId = createWorkflowResponse.body.data.id;
	});

	test('when sharing is disabled', async () => {
		license.disable('feat:sharing');
		await authOwnerAgent
			.put(`/workflows/${savedWorkflowId}/share`)
			.send({ shareWithIds: [memberPersonalProject.id] })
			.expect(403);
	});

	test('when sharing is enabled', async () => {
		license.enable('feat:sharing');
		await authOwnerAgent
			.put(`/workflows/${savedWorkflowId}/share`)
			.send({ shareWithIds: [memberPersonalProject.id] })
			.expect(200);
	});
});

describe('PUT /workflows/:workflowId/share', () => {
	test('should save sharing with new users', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [memberPersonalProject.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(2);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(1);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledWith(
			expect.objectContaining({
				newShareeIds: [member.id],
				sharer: expect.objectContaining({ id: owner.id }),
				workflow: expect.objectContaining({ id: workflow.id }),
			}),
		);
	});

	test('should succeed when sharing with invalid user-id', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [uuid()] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(1);
	});

	test('should allow sharing with pending users', async () => {
		const workflow = await createWorkflow({}, owner);
		const memberShell = await createUserShell('global:member');
		const memberShellPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			memberShell.id,
		);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [memberShellPersonalProject.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(2);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(1);
	});

	test('should allow sharing with multiple users', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [memberPersonalProject.id, anotherMemberPersonalProject.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(3);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(1);
	});

	test('should override sharing', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [memberPersonalProject.id, anotherMemberPersonalProject.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(3);

		const secondResponse = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [memberPersonalProject.id] });
		expect(secondResponse.statusCode).toBe(200);

		const secondSharedWorkflows = await getWorkflowSharing(workflow);
		expect(secondSharedWorkflows).toHaveLength(2);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(2);
	});

	test('should allow sharing by the owner of the workflow', async () => {
		const workflow = await createWorkflow({}, member);

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [anotherMemberPersonalProject.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(2);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(1);
	});

	test('should allow sharing by the instance owner', async () => {
		const workflow = await createWorkflow({}, member);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [anotherMemberPersonalProject.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(2);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(1);
	});

	test('should not allow sharing by another shared member', async () => {
		const workflow = await createWorkflow({}, member);

		await shareWorkflowWithUsers(workflow, [anotherMember]);

		const response = await authAnotherMemberAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [anotherMemberPersonalProject.id, ownerPersonalProject.id] });

		expect(response.statusCode).toBe(403);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(2);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(0);
	});

	test('should not allow sharing with self by another non-shared member', async () => {
		const workflow = await createWorkflow({}, member);

		const response = await authAnotherMemberAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [anotherMemberPersonalProject.id] });

		expect(response.statusCode).toBe(403);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(1);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(0);
	});

	test('should not allow sharing by another non-shared member', async () => {
		const workflow = await createWorkflow({}, member);

		const tempUser = await createUser({ role: 'global:member' });
		const tempUserPersonalProject = await projectRepository.getPersonalProjectForUserOrFail(
			tempUser.id,
		);

		const response = await authAnotherMemberAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [tempUserPersonalProject.id] });

		expect(response.statusCode).toBe(403);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(1);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(0);
	});

	test('should not call internal hooks listener for email sent if emailing is disabled', async () => {
		config.set('userManagement.emails.mode', '');

		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [memberPersonalProject.id] });

		expect(response.statusCode).toBe(200);

		config.set('userManagement.emails.mode', 'smtp');
	});

	test('should ignore sharing with owner project', async () => {
		// ARRANGE
		const project = ownerPersonalProject;
		const workflow = await createWorkflow({ name: 'My workflow' }, project);

		await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [project.id] })
			.expect(200);

		const sharedWorkflows = await Container.get(SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});

		expect(sharedWorkflows).toHaveLength(1);
		expect(sharedWorkflows).toEqual([
			expect.objectContaining({ projectId: project.id, role: 'workflow:owner' }),
		]);
	});

	test('should ignore sharing with project that already has it shared', async () => {
		// ARRANGE
		const project = ownerPersonalProject;
		const workflow = await createWorkflow({ name: 'My workflow' }, project);

		const project2 = memberPersonalProject;
		await shareWorkflowWithProjects(workflow, [{ project: project2 }]);

		await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [project2.id] })
			.expect(200);

		const sharedWorkflows = await Container.get(SharedWorkflowRepository).findBy({
			workflowId: workflow.id,
		});

		expect(sharedWorkflows).toHaveLength(2);
		expect(sharedWorkflows).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ projectId: project.id, role: 'workflow:owner' }),
				expect.objectContaining({ projectId: project2.id, role: 'workflow:editor' }),
			]),
		);
	});
});

describe('GET /workflows/new', () => {
	[true, false].forEach((sharingEnabled) => {
		test(`should return an auto-incremented name, even when sharing is ${
			sharingEnabled ? 'enabled' : 'disabled'
		}`, async () => {
			license.enable('feat:sharing');

			await createWorkflow({ name: 'My workflow' }, owner);
			await createWorkflow({ name: 'My workflow 7' }, owner);

			const response = await authOwnerAgent.get('/workflows/new');
			expect(response.statusCode).toBe(200);
			expect(response.body.data.name).toEqual('My workflow 8');
		});
	});
});

describe('GET /workflows/:workflowId', () => {
	test('should fail with invalid id due to route rule', async () => {
		const response = await authOwnerAgent.get('/workflows/potatoes');

		expect(response.statusCode).toBe(404);
	});

	test('should return 404 for non existing workflow', async () => {
		const response = await authOwnerAgent.get('/workflows/9001');

		expect(response.statusCode).toBe(404);
	});

	test('project viewers can view workflows', async () => {
		const teamProject = await createTeamProject();
		await linkUserToProject(member, teamProject, 'project:viewer');

		const workflow = await createWorkflow({}, teamProject);

		const response = await authMemberAgent.get(`/workflows/${workflow.id}`).expect(200);
		const responseWorkflow: WorkflowWithSharingsMetaDataAndCredentials = response.body.data;

		expect(responseWorkflow.homeProject).toMatchObject({
			id: teamProject.id,
			name: teamProject.name,
			type: 'team',
		});

		expect(responseWorkflow.sharedWithProjects).toHaveLength(0);
	});

	test('should return a workflow with owner', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`).expect(200);
		const responseWorkflow: WorkflowWithSharingsMetaDataAndCredentials = response.body.data;

		expect(responseWorkflow.homeProject).toMatchObject({
			id: ownerPersonalProject.id,
			name: owner.createPersonalProjectName(),
			type: 'personal',
		});

		expect(responseWorkflow.sharedWithProjects).toHaveLength(0);
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		expect((responseWorkflow as any).shared).toBeUndefined();
	});

	test('should return tags', async () => {
		const tag = await createTag({ name: 'A' });
		const workflow = await createWorkflow({ tags: [tag] }, owner);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`).expect(200);

		expect(response.body.data).toMatchObject({
			tags: [expect.objectContaining({ id: tag.id, name: tag.name })],
		});
	});

	test('should return shared workflow with user data', async () => {
		const workflow = await createWorkflow({}, owner);
		await shareWorkflowWithUsers(workflow, [member]);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`).expect(200);
		const responseWorkflow: WorkflowWithSharingsMetaDataAndCredentials = response.body.data;

		expect(responseWorkflow.homeProject).toMatchObject({
			id: ownerPersonalProject.id,
			name: owner.createPersonalProjectName(),
			type: 'personal',
		});

		expect(responseWorkflow.sharedWithProjects).toHaveLength(1);
		expect(responseWorkflow.sharedWithProjects[0]).toMatchObject({
			id: memberPersonalProject.id,
			name: member.createPersonalProjectName(),
			type: 'personal',
		});
	});

	test('should return all sharees', async () => {
		const workflow = await createWorkflow({}, owner);
		await shareWorkflowWithUsers(workflow, [member, anotherMember]);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`).expect(200);
		const responseWorkflow: WorkflowWithSharingsMetaDataAndCredentials = response.body.data;

		expect(responseWorkflow.homeProject).toMatchObject({
			id: ownerPersonalProject.id,
			name: owner.createPersonalProjectName(),
			type: 'personal',
		});

		expect(responseWorkflow.sharedWithProjects).toHaveLength(2);
	});

	test('should return workflow with credentials owned by user', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const workflowPayload = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id, name: savedCredential.name },
		});
		const workflow = await createWorkflow(workflowPayload, owner);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`).expect(200);
		const responseWorkflow: WorkflowWithSharingsMetaDataAndCredentials = response.body.data;

		expect(response.statusCode).toBe(200);
		expect(responseWorkflow.usedCredentials).toMatchObject([
			{
				id: savedCredential.id,
				name: savedCredential.name,
				currentUserHasAccess: true,
			},
		]);

		expect(responseWorkflow.sharedWithProjects).toHaveLength(0);
	});

	test.each([
		['owner', () => owner],
		['admin', () => admin],
	])(
		'should return workflow with credentials saying %s does have access even when not shared',
		async (_description, getActor) => {
			const actor = getActor();
			const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

			const workflowPayload = makeWorkflow({
				withPinData: false,
				withCredential: { id: savedCredential.id, name: savedCredential.name },
			});
			const workflow = await createWorkflow(workflowPayload, actor);

			const response = await testServer
				.authAgentFor(actor)
				.get(`/workflows/${workflow.id}`)
				.expect(200);
			const responseWorkflow: WorkflowWithSharingsMetaDataAndCredentials = response.body.data;

			expect(responseWorkflow.usedCredentials).toMatchObject([
				{
					id: savedCredential.id,
					name: savedCredential.name,
					currentUserHasAccess: true,
				},
			]);

			expect(responseWorkflow.sharedWithProjects).toHaveLength(0);
		},
	);

	test('should return workflow with credentials for all users with or without access', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const workflowPayload = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id, name: savedCredential.name },
		});
		const workflow = await createWorkflow(workflowPayload, member);
		await shareWorkflowWithUsers(workflow, [anotherMember]);

		const responseMember1 = await authMemberAgent.get(`/workflows/${workflow.id}`).expect(200);
		const member1Workflow: WorkflowWithSharingsMetaDataAndCredentials = responseMember1.body.data;

		expect(member1Workflow.usedCredentials).toMatchObject([
			{
				id: savedCredential.id,
				name: savedCredential.name,
				currentUserHasAccess: true, // one user has access
			},
		]);
		expect(member1Workflow.sharedWithProjects).toHaveLength(1);

		const responseMember2 = await authAnotherMemberAgent
			.get(`/workflows/${workflow.id}`)
			.expect(200);
		const member2Workflow: WorkflowWithSharingsMetaDataAndCredentials = responseMember2.body.data;

		expect(member2Workflow.usedCredentials).toMatchObject([
			{
				id: savedCredential.id,
				name: savedCredential.name,
				currentUserHasAccess: false, // the other one doesn't
			},
		]);
		expect(member2Workflow.sharedWithProjects).toHaveLength(1);
	});

	test('should return workflow with credentials for all users with access', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
		// Both users have access to the credential (none is owner)
		await shareCredentialWithUsers(savedCredential, [anotherMember]);

		const workflowPayload = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id, name: savedCredential.name },
		});
		const workflow = await createWorkflow(workflowPayload, member);
		await shareWorkflowWithUsers(workflow, [anotherMember]);

		const responseMember1 = await authMemberAgent.get(`/workflows/${workflow.id}`).expect(200);
		const member1Workflow: WorkflowWithSharingsMetaDataAndCredentials = responseMember1.body.data;

		expect(member1Workflow.usedCredentials).toMatchObject([
			{
				id: savedCredential.id,
				name: savedCredential.name,
				currentUserHasAccess: true,
			},
		]);
		expect(member1Workflow.sharedWithProjects).toHaveLength(1);

		const responseMember2 = await authAnotherMemberAgent
			.get(`/workflows/${workflow.id}`)
			.expect(200);
		const member2Workflow: WorkflowWithSharingsMetaDataAndCredentials = responseMember2.body.data;

		expect(responseMember2.statusCode).toBe(200);
		expect(member2Workflow.usedCredentials).toMatchObject([
			{
				id: savedCredential.id,
				name: savedCredential.name,
				currentUserHasAccess: true,
			},
		]);
		expect(member2Workflow.sharedWithProjects).toHaveLength(1);
	});

	test('should return workflow credentials home project and shared with projects', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
		// Both users have access to the credential (none is owner)
		await shareCredentialWithUsers(savedCredential, [anotherMember]);

		const workflowPayload = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id, name: savedCredential.name },
		});
		const workflow = await createWorkflow(workflowPayload, member);
		await shareWorkflowWithUsers(workflow, [anotherMember]);

		const responseMember1 = await authMemberAgent.get(`/workflows/${workflow.id}`).expect(200);
		const member1Workflow: WorkflowWithSharingsMetaDataAndCredentials = responseMember1.body.data;

		expect(member1Workflow.usedCredentials).toMatchObject([
			{
				id: savedCredential.id,
				name: savedCredential.name,
				currentUserHasAccess: true,
				homeProject: {
					id: memberPersonalProject.id,
				},
				sharedWithProjects: [{ id: anotherMemberPersonalProject.id }],
			},
		]);
		expect(member1Workflow.sharedWithProjects).toHaveLength(1);
	});
});

describe('POST /workflows', () => {
	test('project viewers cannot create workflows', async () => {
		const teamProject = await createTeamProject();
		await linkUserToProject(member, teamProject, 'project:viewer');

		const response = await authMemberAgent
			.post('/workflows')
			.send({ ...makeWorkflow(), projectId: teamProject.id });

		expect(response.body).toMatchObject({
			code: 400,
			message: "You don't have the permissions to save the workflow in this project.",
		});
	});

	it('Should create a workflow that uses no credential', async () => {
		const workflow = makeWorkflow({ withPinData: false });

		const response = await authOwnerAgent.post('/workflows').send(workflow);

		expect(response.statusCode).toBe(200);
	});

	it('Should save a new workflow with credentials', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
		const workflow = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id, name: savedCredential.name },
		});

		const response = await authOwnerAgent.post('/workflows').send(workflow);

		expect(response.statusCode).toBe(200);
	});

	it('Should not allow saving a workflow using credential you have no access', async () => {
		// Credential belongs to owner, member cannot use it.
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
		const workflow = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id, name: savedCredential.name },
		});

		const response = await authMemberAgent.post('/workflows').send(workflow);

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe(
			'The workflow you are trying to save contains credentials that are not shared with you',
		);
	});

	it('Should allow owner to save a workflow using credential owned by others', async () => {
		// Credential belongs to owner, member cannot use it.
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
		const workflow = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id, name: savedCredential.name },
		});

		const response = await authOwnerAgent.post('/workflows').send(workflow);

		expect(response.statusCode).toBe(200);
	});

	it('Should allow saving a workflow using a credential owned by others and shared with you', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
		await shareCredentialWithUsers(savedCredential, [anotherMember]);

		const workflow = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id, name: savedCredential.name },
		});

		const response = await authAnotherMemberAgent.post('/workflows').send(workflow);
		expect(response.statusCode).toBe(200);
	});

	test('Should create workflow history version when licensed', async () => {
		license.enable('feat:workflowHistory');
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
		};

		const response = await authOwnerAgent.post('/workflows').send(payload);

		expect(response.statusCode).toBe(200);

		const {
			data: { id },
		} = response.body;

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

	test('Should not create workflow history version when not licensed', async () => {
		license.disable('feat:workflowHistory');
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
		};

		const response = await authOwnerAgent.post('/workflows').send(payload);

		expect(response.statusCode).toBe(200);

		const {
			data: { id },
		} = response.body;

		expect(id).toBeDefined();
		expect(
			await Container.get(WorkflowHistoryRepository).count({ where: { workflowId: id } }),
		).toBe(0);
	});
});

describe('PATCH /workflows/:workflowId', () => {
	test('project viewers cannot update workflows', async () => {
		const teamProject = await createTeamProject();
		await linkUserToProject(member, teamProject, 'project:viewer');

		const workflow = await createWorkflow({ name: 'WF Name' }, teamProject);

		const response = await authMemberAgent
			.patch(`/workflows/${workflow.id}`)
			.send({ ...workflow, name: 'New Name' });

		expect(response.status).toBe(403);
		expect(response.body).toMatchObject({
			message: 'User is missing a scope required to perform this action',
		});
	});

	describe('validate credential permissions to user', () => {
		it('Should succeed when saving unchanged workflow nodes', async () => {
			const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
			const workflow = {
				name: 'test',
				active: false,
				connections: {},
				nodes: [
					{
						id: 'uuid-1234',
						name: 'Start',
						parameters: {},
						position: [-20, 260],
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						credentials: {
							default: {
								id: savedCredential.id,
								name: savedCredential.name,
							},
						},
					},
				],
			};

			const createResponse = await authOwnerAgent.post('/workflows').send(workflow);
			const { id, versionId } = createResponse.body.data;

			const response = await authOwnerAgent.patch(`/workflows/${id}`).send({
				name: 'new name',
				versionId,
			});

			expect(response.statusCode).toBe(200);
		});

		it('Should allow owner to add node containing credential not shared with the owner', async () => {
			const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
			const workflow = {
				name: 'test',
				active: false,
				connections: {},
				nodes: [
					{
						id: 'uuid-1234',
						name: 'Start',
						parameters: {},
						position: [-20, 260],
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						credentials: {
							default: {
								id: savedCredential.id,
								name: savedCredential.name,
							},
						},
					},
				],
			};

			const createResponse = await authOwnerAgent.post('/workflows').send(workflow);
			const { id, versionId } = createResponse.body.data;

			const response = await authOwnerAgent.patch(`/workflows/${id}`).send({
				versionId,
				nodes: [
					{
						id: 'uuid-1234',
						name: 'Start',
						parameters: {},
						position: [-20, 260],
						type: 'n8n-nodes-base.start',
						typeVersion: 1,
						credentials: {
							default: {
								id: savedCredential.id,
								name: savedCredential.name,
							},
						},
					},
				],
			});

			expect(response.statusCode).toBe(200);
		});

		it.each([
			[
				'the owner and shared with the member',
				'the owner',
				async function creteWorkflow() {
					const workflow = await createWorkflow({}, owner);
					await shareWorkflowWithUsers(workflow, [member]);
					return workflow;
				},
				async function createCredential() {
					return await saveCredential(randomCredentialPayload(), { user: owner });
				},
			],
			[
				'team 1',
				'the member',
				async function creteWorkflow() {
					const team = await createTeamProject('Team 1', member);
					return await createWorkflow({}, team);
				},
				async function createCredential() {
					return await saveCredential(randomCredentialPayload(), { user: member });
				},
			],
			[
				'team 1',
				'team 2',
				async function creteWorkflow() {
					const team1 = await createTeamProject('Team 1', member);
					return await createWorkflow({}, team1);
				},
				async function createCredential() {
					const team2 = await createTeamProject('Team 2', member);
					return await saveCredential(randomCredentialPayload(), { project: team2 });
				},
			],
			[
				'the member',
				'the owner',
				async function creteWorkflow() {
					return await createWorkflow({}, member);
				},
				async function createCredential() {
					return await saveCredential(randomCredentialPayload(), { user: owner });
				},
			],
			[
				'the member',
				'team 2',
				async function creteWorkflow() {
					return await createWorkflow({}, member);
				},
				async function createCredential() {
					const team2 = await createTeamProject('Team 2', member);
					return await saveCredential(randomCredentialPayload(), { project: team2 });
				},
			],
		])(
			'Tamper proofing kicks in if the workflow is owned by %s, the credentials is owned by %s, and the member tries to use the credential in the workflow',
			async (_workflowText, _credentialText, createWorkflow, createCredential) => {
				//
				// ARRANGE
				//
				const workflow = await createWorkflow();
				const credential = await createCredential();

				//
				// ACT
				//
				const response = await authMemberAgent.patch(`/workflows/${workflow.id}`).send({
					versionId: workflow.versionId,
					nodes: [
						{
							id: 'uuid-12345',
							name: 'Start',
							parameters: {},
							position: [-20, 260],
							type: 'n8n-nodes-base.start',
							typeVersion: 1,
							credentials: {
								default: {
									id: credential.id,
									name: credential.name,
								},
							},
						},
					],
				});

				//
				// ASSERT
				//
				expect(response.statusCode).toBe(400);
				expect(response.body.message).toBe(
					"You don't have access to the credentials in the 'Start' node. Ask the owner to share them with you.",
				);
			},
		);

		it('Should succeed but prevent modifying node attributes other than position, name and disabled', async () => {
			const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

			const originalNodes: INode[] = [
				{
					id: 'uuid-1234',
					name: 'Start',
					parameters: {
						firstParam: 123,
					},
					position: [-20, 260],
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					credentials: {
						default: {
							id: savedCredential.id,
							name: savedCredential.name,
						},
					},
				},
			];

			const changedNodes: INode[] = [
				{
					id: 'uuid-1234',
					name: 'End',
					parameters: {
						firstParam: 456,
					},
					position: [-20, 555],
					type: 'n8n-nodes-base.no-op',
					typeVersion: 1,
					credentials: {
						default: {
							id: '200',
							name: 'fake credential',
						},
					},
					disabled: true,
				},
			];

			const expectedNodes: INode[] = [
				{
					id: 'uuid-1234',
					name: 'End',
					parameters: {
						firstParam: 123,
					},
					position: [-20, 555],
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					credentials: {
						default: {
							id: savedCredential.id,
							name: savedCredential.name,
						},
					},
					disabled: true,
				},
			];

			const workflow = {
				name: 'test',
				active: false,
				connections: {},
				nodes: originalNodes,
			};

			const createResponse = await authMemberAgent.post('/workflows').send(workflow);
			const { id, versionId } = createResponse.body.data;

			await authMemberAgent
				.put(`/workflows/${id}/share`)
				.send({ shareWithIds: [anotherMemberPersonalProject.id] })
				.expect(200);

			const response = await authAnotherMemberAgent.patch(`/workflows/${id}`).send({
				versionId,
				nodes: changedNodes,
			});

			expect(response.statusCode).toBe(200);
			expect(response.body.data.nodes).toMatchObject(expectedNodes);
		});
	});

	describe('validate interim updates', () => {
		it('should block owner updating workflow nodes on interim update by member', async () => {
			// owner creates and shares workflow

			const createResponse = await authOwnerAgent.post('/workflows').send(makeWorkflow());
			const { id, versionId: ownerVersionId } = createResponse.body.data;
			await authOwnerAgent
				.put(`/workflows/${id}/share`)
				.send({ shareWithIds: [memberPersonalProject.id] });

			// member accesses and updates workflow name

			const memberGetResponse = await authMemberAgent.get(`/workflows/${id}`);
			const { versionId: memberVersionId } = memberGetResponse.body.data;

			await authMemberAgent
				.patch(`/workflows/${id}`)
				.send({ name: 'Update by member', versionId: memberVersionId });

			// owner blocked from updating workflow nodes

			const updateAttemptResponse = await authOwnerAgent
				.patch(`/workflows/${id}`)
				.send({ nodes: [], versionId: ownerVersionId });

			expect(updateAttemptResponse.status).toBe(400);
			expect(updateAttemptResponse.body.code).toBe(100);
		});

		it('should block member updating workflow nodes on interim update by owner', async () => {
			// owner creates, updates and shares workflow

			const createResponse = await authOwnerAgent.post('/workflows').send(makeWorkflow());
			const { id, versionId: ownerFirstVersionId } = createResponse.body.data;

			const updateResponse = await authOwnerAgent
				.patch(`/workflows/${id}`)
				.send({ name: 'Update by owner', versionId: ownerFirstVersionId });

			const { versionId: ownerSecondVersionId } = updateResponse.body.data;

			await authOwnerAgent
				.put(`/workflows/${id}/share`)
				.send({ shareWithIds: [memberPersonalProject.id] });

			// member accesses workflow

			const memberGetResponse = await authMemberAgent.get(`/workflows/${id}`);
			const { versionId: memberVersionId } = memberGetResponse.body.data;

			// owner re-updates workflow

			await authOwnerAgent
				.patch(`/workflows/${id}`)
				.send({ name: 'Owner update again', versionId: ownerSecondVersionId });

			// member blocked from updating workflow

			const updateAttemptResponse = await authMemberAgent
				.patch(`/workflows/${id}`)
				.send({ nodes: [], versionId: memberVersionId });

			expect(updateAttemptResponse.status).toBe(400);
			expect(updateAttemptResponse.body.code).toBe(100);
		});

		it('should block owner activation on interim activation by member', async () => {
			// owner creates and shares workflow

			const createResponse = await authOwnerAgent.post('/workflows').send(makeWorkflow());
			const { id, versionId: ownerVersionId } = createResponse.body.data;
			await authOwnerAgent
				.put(`/workflows/${id}/share`)
				.send({ shareWithIds: [memberPersonalProject.id] });

			// member accesses and activates workflow

			const memberGetResponse = await authMemberAgent.get(`/workflows/${id}`);
			const { versionId: memberVersionId } = memberGetResponse.body.data;
			await authMemberAgent
				.patch(`/workflows/${id}`)
				.send({ active: true, versionId: memberVersionId, name: 'Update by member' });
			// owner blocked from activating workflow

			const activationAttemptResponse = await authOwnerAgent
				.patch(`/workflows/${id}`)
				.send({ active: true, versionId: ownerVersionId, name: 'Update by owner' });

			expect(activationAttemptResponse.status).toBe(400);
			expect(activationAttemptResponse.body.code).toBe(100);
		});

		it('should block member activation on interim activation by owner', async () => {
			// owner creates, updates and shares workflow

			const createResponse = await authOwnerAgent.post('/workflows').send(makeWorkflow());
			const { id, versionId: ownerFirstVersionId } = createResponse.body.data;

			const updateResponse = await authOwnerAgent
				.patch(`/workflows/${id}`)
				.send({ name: 'Update by owner', versionId: ownerFirstVersionId });
			const { versionId: ownerSecondVersionId } = updateResponse.body.data;

			await authOwnerAgent
				.put(`/workflows/${id}/share`)
				.send({ shareWithIds: [memberPersonalProject.id] });

			// member accesses workflow

			const memberGetResponse = await authMemberAgent.get(`/workflows/${id}`);
			const { versionId: memberVersionId } = memberGetResponse.body.data;

			// owner activates workflow

			await authOwnerAgent
				.patch(`/workflows/${id}`)
				.send({ active: true, versionId: ownerSecondVersionId, name: 'Owner update again' });

			// member blocked from activating workflow

			const updateAttemptResponse = await authMemberAgent
				.patch(`/workflows/${id}`)
				.send({ active: true, versionId: memberVersionId, name: 'Update by member' });

			expect(updateAttemptResponse.status).toBe(400);
			expect(updateAttemptResponse.body.code).toBe(100);
		});

		it('should block member updating workflow settings on interim update by owner', async () => {
			// owner creates and shares workflow

			const createResponse = await authOwnerAgent.post('/workflows').send(makeWorkflow());
			const { id, versionId: ownerVersionId } = createResponse.body.data;
			await authOwnerAgent
				.put(`/workflows/${id}/share`)
				.send({ shareWithIds: [memberPersonalProject.id] });

			// member accesses workflow

			const memberGetResponse = await authMemberAgent.get(`/workflows/${id}`);
			const { versionId: memberVersionId } = memberGetResponse.body.data;

			// owner updates workflow name

			await authOwnerAgent
				.patch(`/workflows/${id}`)
				.send({ name: 'Another name', versionId: ownerVersionId });

			// member blocked from updating workflow settings

			const updateAttemptResponse = await authMemberAgent
				.patch(`/workflows/${id}`)
				.send({ settings: { saveManualExecutions: true }, versionId: memberVersionId });

			expect(updateAttemptResponse.status).toBe(400);
			expect(updateAttemptResponse.body.code).toBe(100);
		});

		it('should block member updating workflow name on interim update by owner', async () => {
			// owner creates and shares workflow

			const createResponse = await authOwnerAgent.post('/workflows').send(makeWorkflow());
			const { id, versionId: ownerVersionId } = createResponse.body.data;
			await authOwnerAgent
				.put(`/workflows/${id}/share`)
				.send({ shareWithIds: [memberPersonalProject.id] });

			// member accesses workflow

			const memberGetResponse = await authMemberAgent.get(`/workflows/${id}`).expect(200);
			const { versionId: memberVersionId } = memberGetResponse.body.data;

			// owner updates workflow settings

			await authOwnerAgent
				.patch(`/workflows/${id}`)
				.send({ settings: { saveManualExecutions: true }, versionId: ownerVersionId });

			// member blocked from updating workflow name

			const updateAttemptResponse = await authMemberAgent
				.patch(`/workflows/${id}`)
				.send({ settings: { saveManualExecutions: true }, versionId: memberVersionId });

			expect(updateAttemptResponse.status).toBe(400);
			expect(updateAttemptResponse.body.code).toBe(100);
		});
	});

	describe('workflow history', () => {
		test('Should create workflow history version when licensed', async () => {
			license.enable('feat:workflowHistory');
			const workflow = await createWorkflow({}, owner);
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
				},
			};

			const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

			const {
				data: { id },
			} = response.body;

			expect(response.statusCode).toBe(200);

			expect(id).toBe(workflow.id);
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

		test('Should not create workflow history version when not licensed', async () => {
			license.disable('feat:workflowHistory');
			const workflow = await createWorkflow({}, owner);
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
				},
			};

			const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

			const {
				data: { id },
			} = response.body;

			expect(response.statusCode).toBe(200);

			expect(id).toBe(workflow.id);
			expect(
				await Container.get(WorkflowHistoryRepository).count({ where: { workflowId: id } }),
			).toBe(0);
		});
	});

	describe('activate workflow', () => {
		test('should activate workflow without changing version ID', async () => {
			license.disable('feat:workflowHistory');
			const workflow = await createWorkflow({}, owner);
			const payload = {
				versionId: workflow.versionId,
				active: true,
			};

			const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

			expect(response.statusCode).toBe(200);
			expect(activeWorkflowManager.add).toBeCalled();

			const {
				data: { id, versionId, active },
			} = response.body;

			expect(id).toBe(workflow.id);
			expect(versionId).toBe(workflow.versionId);
			expect(active).toBe(true);
		});

		test('should deactivate workflow without changing version ID', async () => {
			license.disable('feat:workflowHistory');
			const workflow = await createWorkflow({ active: true }, owner);
			const payload = {
				versionId: workflow.versionId,
				active: false,
			};

			const response = await authOwnerAgent.patch(`/workflows/${workflow.id}`).send(payload);

			expect(response.statusCode).toBe(200);
			expect(activeWorkflowManager.add).not.toBeCalled();
			expect(activeWorkflowManager.remove).toBeCalled();

			const {
				data: { id, versionId, active },
			} = response.body;

			expect(id).toBe(workflow.id);
			expect(versionId).toBe(workflow.versionId);
			expect(active).toBe(false);
		});
	});
});

describe('PUT /:workflowId/transfer', () => {
	test('cannot transfer into the same project', async () => {
		const destinationProject = await createTeamProject('Team Project', member);

		const workflow = await createWorkflow({}, destinationProject);

		await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(400);
	});

	test('cannot transfer somebody elses workflow', async () => {
		const destinationProject = await createTeamProject('Team Project', member);

		const workflow = await createWorkflow({}, anotherMember);

		await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(403);
	});

	test("cannot transfer if you're not a member of the destination project", async () => {
		const destinationProject = await createTeamProject('Team Project', anotherMember);

		const workflow = await createWorkflow({}, member);

		await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(404);
	});

	test.each<ProjectRole>(['project:editor', 'project:viewer'])(
		'%ss cannot transfer workflows',
		async (projectRole) => {
			//
			// ARRANGE
			//
			const sourceProject = await createTeamProject();
			await linkUserToProject(member, sourceProject, projectRole);

			const workflow = await createWorkflow({}, sourceProject);

			const destinationProject = await createTeamProject();
			await linkUserToProject(member, destinationProject, 'project:admin');

			//
			// ACT & ASSERT
			//
			await testServer
				.authAgentFor(member)
				.put(`/workflows/${workflow.id}/transfer`)
				.send({ destinationProjectId: destinationProject.id })
				.expect(403);
		},
	);

	test.each<
		[
			// user role
			'owners' | 'admins',
			// source project type
			'team' | 'personal',
			// destination project type
			'team' | 'personal',
			// actor
			() => User,
			// source project
			() => Promise<Project> | Project,
			// destination project
			() => Promise<Project> | Project,
		]
	>([
		// owner
		[
			'owners',
			'team',
			'team',
			() => owner,
			async () => await createTeamProject('Source Project'),
			async () => await createTeamProject('Destination Project'),
		],
		[
			'owners',
			'team',
			'personal',
			() => owner,
			async () => await createTeamProject('Source Project'),
			() => memberPersonalProject,
		],
		[
			'owners',
			'personal',
			'team',
			() => owner,
			() => memberPersonalProject,
			async () => await createTeamProject('Destination Project'),
		],

		// admin
		[
			'admins',
			'team',
			'team',
			() => admin,
			async () => await createTeamProject('Source Project'),
			async () => await createTeamProject('Destination Project'),
		],
		[
			'admins',
			'team',
			'personal',
			() => admin,
			async () => await createTeamProject('Source Project'),
			() => memberPersonalProject,
		],
		[
			'admins',
			'personal',
			'team',
			() => admin,
			() => memberPersonalProject,
			async () => await createTeamProject('Destination Project'),
		],
	])(
		'global %s can transfer workflows from a %s project to a %s project',
		async (
			_roleName,
			_sourceProjectName,
			_destinationProjectName,
			getActor,
			getSourceProject,
			getDestinationProject,
		) => {
			// ARRANGE
			const actor = getActor();
			const sourceProject = await getSourceProject();
			const destinationProject = await getDestinationProject();
			const workflow = await createWorkflow({}, sourceProject);

			// ACT
			const response = await testServer
				.authAgentFor(actor)
				.put(`/workflows/${workflow.id}/transfer`)
				.send({ destinationProjectId: destinationProject.id })
				.expect(200);

			// ASSERT
			expect(response.body).toEqual({});

			const allSharings = await getWorkflowSharing(workflow);
			expect(allSharings).toHaveLength(1);
			expect(allSharings[0]).toMatchObject({
				projectId: destinationProject.id,
				workflowId: workflow.id,
				role: 'workflow:owner',
			});
		},
	);

	test('removes and re-adds the workflow from the active workflow manager during the transfer', async () => {
		//
		// ARRANGE
		//
		const destinationProject = await createTeamProject('Team Project', member);

		const workflow = await createWorkflow({ active: true }, member);

		//
		// ACT
		//
		const response = await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(200);

		//
		// ASSERT
		//
		expect(response.body).toEqual({});

		expect(activeWorkflowManager.remove).toHaveBeenCalledWith(workflow.id);
		expect(activeWorkflowManager.add).toHaveBeenCalledWith(workflow.id, 'update');
	});

	test('should move workflow to project root if `destinationParentFolderId` is not provided', async () => {
		//
		// ARRANGE
		//
		const destinationProject = await createTeamProject('Team Project', member);

		const folder = await createFolder(destinationProject, { name: 'Test Folder' });

		const workflow = await createWorkflow({ active: true, parentFolder: folder }, member);

		//
		// ACT
		//
		const response = await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(200);

		//
		// ASSERT
		//
		expect(response.body).toEqual({});

		const workflowFromDB = await workflowRepository.findOneOrFail({
			where: { id: workflow.id },
			relations: ['parentFolder'],
		});

		expect(workflowFromDB.parentFolder).toBeNull();
	});

	test('should move workflow to the parent folder in source project if `destinationParentFolderId` is provided', async () => {
		//
		// ARRANGE
		//
		const destinationProject = await createTeamProject('Team Project', member);

		const folder = await createFolder(destinationProject, { name: 'Test Folder' });

		const workflow = await createWorkflow({ active: true, parentFolder: folder }, member);

		//
		// ACT
		//
		const response = await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id, destinationParentFolderId: folder.id })
			.expect(200);

		//
		// ASSERT
		//
		expect(response.body).toEqual({});

		const workflowFromDB = await workflowRepository.findOneOrFail({
			where: { id: workflow.id },
			relations: ['parentFolder'],
		});

		expect(workflowFromDB.parentFolder?.id).toBe(folder.id);
	});

	test('should fail destination parent folder does not exist in project', async () => {
		//
		// ARRANGE
		//
		const destinationProject = await createTeamProject('Team Project', member);

		const anotherProject = await createTeamProject('Another Project', member);

		const folderInDestinationProject = await createFolder(destinationProject, {
			name: 'Test Folder',
		});

		const anotherFolder = await createFolder(destinationProject, {
			name: 'Another Test Folder',
		});

		const workflow = await createWorkflow(
			{ active: true, parentFolder: folderInDestinationProject },
			member,
		);

		//
		// ACT
		//
		await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({
				destinationProjectId: anotherProject.id,
				destinationParentFolderId: anotherFolder.id,
			})
			.expect(400);
	});

	test('deactivates the workflow if it cannot be added to the active workflow manager again and returns the WorkflowActivationError as data', async () => {
		//
		// ARRANGE
		//
		const destinationProject = await createTeamProject('Team Project', member);

		const workflow = await createWorkflow({ active: true }, member);

		activeWorkflowManager.add.mockRejectedValue(new WorkflowActivationError('Failed'));

		//
		// ACT
		//
		const response = await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(200);

		//
		// ASSERT
		//
		expect(response.body).toMatchObject({
			data: {
				error: {
					message: 'Failed',
					name: 'WorkflowActivationError',
				},
			},
		});

		expect(activeWorkflowManager.remove).toHaveBeenCalledWith(workflow.id);
		expect(activeWorkflowManager.add).toHaveBeenCalledWith(workflow.id, 'update');

		const workflowFromDB = await workflowRepository.findOneByOrFail({ id: workflow.id });
		expect(workflowFromDB).toMatchObject({ active: false });
	});

	test('owner transfers workflow from project they are not part of, e.g. test global cred sharing scope', async () => {
		// ARRANGE
		const sourceProject = await createTeamProject('source project', admin);
		const destinationProject = await createTeamProject('destination project', member);
		const workflow = await createWorkflow({}, sourceProject);
		const credential = await saveCredential(randomCredentialPayload(), { project: sourceProject });

		// ACT
		await testServer
			.authAgentFor(owner)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				shareCredentials: [credential.id],
			})
			.expect(200);

		// ASSERT
		const allWorkflowSharings = await getWorkflowSharing(workflow);
		expect(allWorkflowSharings).toHaveLength(1);
		expect(allWorkflowSharings[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow.id,
			role: 'workflow:owner',
		});

		const allCredentialSharings = await getCredentialSharings(credential);
		expect(allCredentialSharings).toHaveLength(2);
		expect(allCredentialSharings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					projectId: sourceProject.id,
					credentialsId: credential.id,
					role: 'credential:owner',
				}),
				expect.objectContaining({
					projectId: destinationProject.id,
					credentialsId: credential.id,
					role: 'credential:user',
				}),
			]),
		);
	});

	test('admin transfers workflow from project they are not part of, e.g. test global cred sharing scope', async () => {
		// ARRANGE
		const sourceProject = await createTeamProject('source project', owner);
		const destinationProject = await createTeamProject('destination project', owner);
		const workflow = await createWorkflow({}, sourceProject);
		const credential = await saveCredential(randomCredentialPayload(), { project: sourceProject });

		// ACT
		await testServer
			.authAgentFor(admin)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				shareCredentials: [credential.id],
			})
			.expect(200);

		// ASSERT
		const allWorkflowSharings = await getWorkflowSharing(workflow);
		expect(allWorkflowSharings).toHaveLength(1);
		expect(allWorkflowSharings[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow.id,
			role: 'workflow:owner',
		});

		const allCredentialSharings = await getCredentialSharings(credential);
		expect(allCredentialSharings).toHaveLength(2);
		expect(allCredentialSharings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					projectId: sourceProject.id,
					credentialsId: credential.id,
					role: 'credential:owner',
				}),
				expect.objectContaining({
					projectId: destinationProject.id,
					credentialsId: credential.id,
					role: 'credential:user',
				}),
			]),
		);
	});

	test('member transfers workflow from personal project to team project and wf contains a credential that they can use but not share', async () => {
		// ARRANGE
		const sourceProject = memberPersonalProject;
		const destinationProject = await createTeamProject('destination project', member);
		const workflow = await createWorkflow({}, sourceProject);
		const credential = await saveCredential(randomCredentialPayload(), { user: owner });

		await shareCredentialWithUsers(credential, [member]);

		// ACT
		await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				shareCredentials: [credential.id],
			})
			.expect(200);

		// ASSERT
		const allWorkflowSharings = await getWorkflowSharing(workflow);
		expect(allWorkflowSharings).toHaveLength(1);
		expect(allWorkflowSharings[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow.id,
			role: 'workflow:owner',
		});

		const allCredentialSharings = await getCredentialSharings(credential);
		expect(allCredentialSharings).toHaveLength(2);
		expect(allCredentialSharings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					projectId: ownerPersonalProject.id,
					credentialsId: credential.id,
					role: 'credential:owner',
				}),
				expect.objectContaining({
					projectId: sourceProject.id,
					credentialsId: credential.id,
					role: 'credential:user',
				}),
			]),
		);
	});

	test('member transfers workflow from their personal project to another team project in which they have editor role', async () => {
		// ARRANGE
		const sourceProject = memberPersonalProject;
		const destinationProject = await createTeamProject('destination project');
		const workflow = await createWorkflow({}, sourceProject);
		const credential = await saveCredential(randomCredentialPayload(), { project: sourceProject });

		await linkUserToProject(member, destinationProject, 'project:editor');

		// ACT
		await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				shareCredentials: [credential.id],
			})
			.expect(200);

		// ASSERT
		const allWorkflowSharings = await getWorkflowSharing(workflow);
		expect(allWorkflowSharings).toHaveLength(1);
		expect(allWorkflowSharings[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow.id,
			role: 'workflow:owner',
		});

		const allCredentialSharings = await getCredentialSharings(credential);
		expect(allCredentialSharings).toHaveLength(2);
		expect(allCredentialSharings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					projectId: sourceProject.id,
					credentialsId: credential.id,
					role: 'credential:owner',
				}),
				expect.objectContaining({
					projectId: destinationProject.id,
					credentialsId: credential.id,
					role: 'credential:user',
				}),
			]),
		);
	});

	test('member transfers workflow from a team project as project admin to another team project in which they have editor role', async () => {
		// ARRANGE
		const sourceProject = await createTeamProject('source project', member);
		const destinationProject = await createTeamProject('destination project');
		const workflow = await createWorkflow({}, sourceProject);
		const credential = await saveCredential(randomCredentialPayload(), { project: sourceProject });

		await linkUserToProject(member, destinationProject, 'project:editor');

		// ACT
		await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				shareCredentials: [credential.id],
			})
			.expect(200);

		// ASSERT
		const allWorkflowSharings = await getWorkflowSharing(workflow);
		expect(allWorkflowSharings).toHaveLength(1);
		expect(allWorkflowSharings[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow.id,
			role: 'workflow:owner',
		});

		const allCredentialSharings = await getCredentialSharings(credential);
		expect(allCredentialSharings).toHaveLength(2);
		expect(allCredentialSharings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					projectId: sourceProject.id,
					credentialsId: credential.id,
					role: 'credential:owner',
				}),
				expect.objectContaining({
					projectId: destinationProject.id,
					credentialsId: credential.id,
					role: 'credential:user',
				}),
			]),
		);
	});

	test('member transfers workflow from a team project as project admin to another team project in which they have editor role but cannot share the credential that is only shared into the source project', async () => {
		// ARRANGE
		const sourceProject = await createTeamProject('source project', member);
		const destinationProject = await createTeamProject('destination project');
		const ownerProject = await getPersonalProject(owner);
		const workflow = await createWorkflow({}, sourceProject);
		const credential = await saveCredential(randomCredentialPayload(), { user: owner });

		await linkUserToProject(member, destinationProject, 'project:editor');
		await shareCredentialWithProjects(credential, [sourceProject]);

		// ACT
		await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				shareCredentials: [credential.id],
			})
			.expect(200);

		// ASSERT
		const allWorkflowSharings = await getWorkflowSharing(workflow);
		expect(allWorkflowSharings).toHaveLength(1);
		expect(allWorkflowSharings[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow.id,
			role: 'workflow:owner',
		});

		const allCredentialSharings = await getCredentialSharings(credential);
		expect(allCredentialSharings).toHaveLength(2);
		expect(allCredentialSharings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					projectId: ownerProject.id,
					credentialsId: credential.id,
					role: 'credential:owner',
				}),
				expect.objectContaining({
					projectId: sourceProject.id,
					credentialsId: credential.id,
					role: 'credential:user',
				}),
			]),
		);
	});

	test('member transfers workflow from a team project as project admin to another team project in which they have editor role but cannot share all the credentials', async () => {
		// ARRANGE
		const sourceProject = await createTeamProject('source project', member);
		const workflow = await createWorkflow({}, sourceProject);
		const credential = await saveCredential(randomCredentialPayload(), { project: sourceProject });

		const ownersCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const destinationProject = await createTeamProject('destination project');
		await linkUserToProject(member, destinationProject, 'project:editor');

		// ACT
		await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({
				destinationProjectId: destinationProject.id,
				shareCredentials: [credential.id, ownersCredential.id],
			})
			.expect(200);

		// ASSERT
		const allWorkflowSharings = await getWorkflowSharing(workflow);
		expect(allWorkflowSharings).toHaveLength(1);
		expect(allWorkflowSharings[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow.id,
			role: 'workflow:owner',
		});

		const allCredentialSharings = await getCredentialSharings(credential);
		expect(allCredentialSharings).toHaveLength(2);
		expect(allCredentialSharings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					projectId: sourceProject.id,
					credentialsId: credential.id,
					role: 'credential:owner',
				}),
				expect.objectContaining({
					projectId: destinationProject.id,
					credentialsId: credential.id,
					role: 'credential:user',
				}),
			]),
		);

		const ownerCredentialSharings = await getCredentialSharings(ownersCredential);
		expect(ownerCredentialSharings).toHaveLength(1);
		expect(ownerCredentialSharings).toEqual([
			expect.objectContaining({
				projectId: ownerPersonalProject.id,
				credentialsId: ownersCredential.id,
				role: 'credential:owner',
			}),
		]);
	});

	test('returns a 500 if the workflow cannot be activated due to an unknown error', async () => {
		//
		// ARRANGE
		//
		const destinationProject = await createTeamProject('Team Project', member);

		const workflow = await createWorkflow({ active: true }, member);

		activeWorkflowManager.add.mockRejectedValue(new ApplicationError('Oh no!'));

		//
		// ACT & ASSERT
		//
		await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(500);
	});
});

describe('POST /workflows/:workflowId/run', () => {
	test('project viewers cannot run workflows', async () => {
		const teamProject = await createTeamProject();
		await linkUserToProject(member, teamProject, 'project:viewer');

		const workflow = await createWorkflow({}, teamProject);

		const response = await authMemberAgent
			.post(`/workflows/${workflow.id}/run`)
			.send({ workflowData: workflow });

		expect(response.status).toBe(403);
		expect(response.body).toMatchObject({
			message: 'User is missing a scope required to perform this action',
		});
	});
});
