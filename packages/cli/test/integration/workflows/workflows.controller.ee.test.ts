import Container from 'typedi';
import { v4 as uuid } from 'uuid';
import { ApplicationError, WorkflowActivationError, type INode } from 'n8n-workflow';

import config from '@/config';
import type { Project } from '@db/entities/Project';
import { ProjectRepository } from '@db/repositories/project.repository';
import type { User } from '@db/entities/User';
import { WorkflowHistoryRepository } from '@db/repositories/workflowHistory.repository';
import { ActiveWorkflowManager } from '@/ActiveWorkflowManager';
import { License } from '@/License';
import { UserManagementMailer } from '@/UserManagement/email';
import type { WorkflowWithSharingsMetaDataAndCredentials } from '@/workflows/workflows.types';

import { mockInstance } from '../../shared/mocking';
import * as utils from '../shared/utils/';
import * as testDb from '../shared/testDb';
import type { SaveCredentialFunction } from '../shared/types';
import { makeWorkflow } from '../shared/utils/';
import { randomCredentialPayload } from '../shared/random';
import { affixRoleToSaveCredential, shareCredentialWithUsers } from '../shared/db/credentials';
import { createAdmin, createOwner, createUser, createUserShell } from '../shared/db/users';
import { createWorkflow, getWorkflowSharing, shareWorkflowWithUsers } from '../shared/db/workflows';
import { createTag } from '../shared/db/tags';
import type { SuperAgentTest } from '../shared/types';
import { createTeamProject, linkUserToProject } from '../shared/db/projects';
import { WorkflowRepository } from '@/databases/repositories/workflow.repository';

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

const sharingSpy = jest.spyOn(License.prototype, 'isSharingEnabled').mockReturnValue(true);
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

	await testDb.truncate(['Workflow', 'SharedWorkflow', 'WorkflowHistory', 'Tag']);
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
		sharingSpy.mockReturnValueOnce(false);

		await authOwnerAgent
			.put(`/workflows/${savedWorkflowId}/share`)
			.send({ shareWithIds: [memberPersonalProject.id] })
			.expect(404);
	});

	test('when sharing is enabled', async () => {
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
});

describe('GET /workflows/new', () => {
	[true, false].forEach((sharingEnabled) => {
		test(`should return an auto-incremented name, even when sharing is ${
			sharingEnabled ? 'enabled' : 'disabled'
		}`, async () => {
			sharingSpy.mockReturnValueOnce(sharingEnabled);

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

	test('should return workflow with credentials saying owner does not have access when not shared', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const workflowPayload = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id, name: savedCredential.name },
		});
		const workflow = await createWorkflow(workflowPayload, owner);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`).expect(200);
		const responseWorkflow: WorkflowWithSharingsMetaDataAndCredentials = response.body.data;

		expect(responseWorkflow.usedCredentials).toMatchObject([
			{
				id: savedCredential.id,
				name: savedCredential.name,
				currentUserHasAccess: false, // although owner can see, they do not have access
			},
		]);

		expect(responseWorkflow.sharedWithProjects).toHaveLength(0);
	});

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
});

describe('POST /workflows', () => {
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

describe('PATCH /workflows/:workflowId - validate credential permissions to user', () => {
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

	it('Should prevent member from adding node containing credential inaccessible to member', async () => {
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

		const response = await authMemberAgent.patch(`/workflows/${id}`).send({
			versionId,
			nodes: [
				{
					id: 'uuid-1234',
					name: 'Start',
					parameters: {},
					position: [-20, 260],
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					credentials: {},
				},
				{
					id: 'uuid-12345',
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
		expect(response.statusCode).toBe(403);
	});

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

describe('PATCH /workflows/:workflowId - validate interim updates', () => {
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

describe('PATCH /workflows/:workflowId - workflow history', () => {
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

describe('PATCH /workflows/:workflowId - activate workflow', () => {
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

	test('cannot transfer into a personal project', async () => {
		const sourceProject = await createTeamProject('Team Project', member);

		const workflow = await createWorkflow({}, sourceProject);

		await testServer
			.authAgentFor(member)
			.put(`/workflows/${workflow.id}/transfer`)
			.send({ destinationProjectId: memberPersonalProject.id })
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

	test('project:editors cannot transfer workflows', async () => {
		//
		// ARRANGE
		//
		const sourceProject = await createTeamProject();
		await linkUserToProject(member, sourceProject, 'project:editor');

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
	});

	test('transferring from a personal project to a team project severs all sharings', async () => {
		//
		// ARRANGE
		//
		const workflow = await createWorkflow({}, member);

		// these sharings should be deleted by the transfer
		await shareWorkflowWithUsers(workflow, [anotherMember, owner]);

		const destinationProject = await createTeamProject('Team Project', member);

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

		const allSharings = await getWorkflowSharing(workflow);
		expect(allSharings).toHaveLength(1);
		expect(allSharings[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow.id,
			role: 'workflow:owner',
		});
	});

	test('can transfer from team to another team project', async () => {
		//
		// ARRANGE
		//
		const sourceProject = await createTeamProject('Team Project 1', member);
		const workflow = await createWorkflow({}, sourceProject);

		const destinationProject = await createTeamProject('Team Project 2', member);

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

		const allSharings = await getWorkflowSharing(workflow);
		expect(allSharings).toHaveLength(1);
		expect(allSharings[0]).toMatchObject({
			projectId: destinationProject.id,
			workflowId: workflow.id,
			role: 'workflow:owner',
		});
	});

	test.each([
		['owners', () => owner],
		['admins', () => admin],
	])(
		'global %s can always transfer from any personal or team project into any team project',
		async (_name, actor) => {
			//
			// ARRANGE
			//
			const sourceProject = await createTeamProject('Source Project', member);
			const teamWorkflow = await createWorkflow({}, sourceProject);

			const personalWorkflow = await createWorkflow({}, member);

			const destinationProject = await createTeamProject('Destination Project', member);

			//
			// ACT
			//
			const response1 = await testServer
				.authAgentFor(actor())
				.put(`/workflows/${teamWorkflow.id}/transfer`)
				.send({ destinationProjectId: destinationProject.id })
				.expect(200);
			const response2 = await testServer
				.authAgentFor(actor())
				.put(`/workflows/${personalWorkflow.id}/transfer`)
				.send({ destinationProjectId: destinationProject.id })
				.expect(200);

			//
			// ASSERT
			//
			expect(response1.body).toEqual({});
			expect(response2.body).toEqual({});

			{
				const allSharings = await getWorkflowSharing(teamWorkflow);
				expect(allSharings).toHaveLength(1);
				expect(allSharings[0]).toMatchObject({
					projectId: destinationProject.id,
					workflowId: teamWorkflow.id,
					role: 'workflow:owner',
				});
			}

			{
				const allSharings = await getWorkflowSharing(personalWorkflow);
				expect(allSharings).toHaveLength(1);
				expect(allSharings[0]).toMatchObject({
					projectId: destinationProject.id,
					workflowId: personalWorkflow.id,
					role: 'workflow:owner',
				});
			}
		},
	);

	test.each([
		['owners', () => owner],
		['admins', () => admin],
	])('global %s cannot transfer into personal projects', async (_name, actor) => {
		//
		// ARRANGE
		//
		const sourceProject = await createTeamProject('Source Project', member);
		const teamWorkflow = await createWorkflow({}, sourceProject);

		const personalWorkflow = await createWorkflow({}, member);

		const destinationProject = anotherMemberPersonalProject;

		//
		// ACT & ASSERT
		//
		await testServer
			.authAgentFor(actor())
			.put(`/workflows/${teamWorkflow.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(400);
		await testServer
			.authAgentFor(actor())
			.put(`/workflows/${personalWorkflow.id}/transfer`)
			.send({ destinationProjectId: destinationProject.id })
			.expect(400);
	});

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
