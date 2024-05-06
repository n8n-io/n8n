import Container from 'typedi';
import type { SuperAgentTest } from 'supertest';
import { v4 as uuid } from 'uuid';
import type { INode } from 'n8n-workflow';

import type { User } from '@db/entities/User';
import { WorkflowHistoryRepository } from '@db/repositories/workflowHistory.repository';
import { ActiveWorkflowManager } from '@/ActiveWorkflowManager';
import { WorkflowSharingService } from '@/workflows/workflowSharing.service';

import { mockInstance } from '../../shared/mocking';
import * as utils from '../shared/utils/';
import * as testDb from '../shared/testDb';
import type { SaveCredentialFunction } from '../shared/types';
import { makeWorkflow } from '../shared/utils/';
import { randomCredentialPayload } from '../shared/random';
import { affixRoleToSaveCredential, shareCredentialWithUsers } from '../shared/db/credentials';
import { createUser } from '../shared/db/users';
import { createWorkflow, getWorkflowSharing, shareWorkflowWithUsers } from '../shared/db/workflows';
import { License } from '@/License';
import { UserManagementMailer } from '@/UserManagement/email';
import config from '@/config';

let owner: User;
let member: User;
let anotherMember: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let authAnotherMemberAgent: SuperAgentTest;
let saveCredential: SaveCredentialFunction;

const activeWorkflowManager = mockInstance(ActiveWorkflowManager);

const sharingSpy = jest.spyOn(License.prototype, 'isSharingEnabled').mockReturnValue(true);
const testServer = utils.setupTestServer({
	endpointGroups: ['workflows'],
	enabledFeatures: ['feat:sharing'],
});
const license = testServer.license;
const mailer = mockInstance(UserManagementMailer);

beforeAll(async () => {
	owner = await createUser({ role: 'global:owner' });
	member = await createUser({ role: 'global:member' });
	anotherMember = await createUser({ role: 'global:member' });

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
	authAnotherMemberAgent = testServer.authAgentFor(anotherMember);

	saveCredential = affixRoleToSaveCredential('credential:owner');

	await utils.initNodeTypes();
});

beforeEach(async () => {
	activeWorkflowManager.add.mockReset();
	activeWorkflowManager.remove.mockReset();

	await testDb.truncate(['Workflow', 'SharedWorkflow', 'WorkflowHistory']);
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
			.send({ shareWithIds: [member.id] })
			.expect(404);
	});

	test('when sharing is enabled', async () => {
		await authOwnerAgent
			.put(`/workflows/${savedWorkflowId}/share`)
			.send({ shareWithIds: [member.id] })
			.expect(200);
	});
});

describe('PUT /workflows/:id', () => {
	test('PUT /workflows/:id/share should save sharing with new users', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [member.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(2);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(1);
	});

	test('PUT /workflows/:id/share should succeed when sharing with invalid user-id', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [uuid()] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(1);
	});

	test('PUT /workflows/:id/share should allow sharing with multiple users', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [member.id, anotherMember.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(3);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(1);
	});

	test('PUT /workflows/:id/share should override sharing', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [member.id, anotherMember.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(3);

		const secondResponse = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [member.id] });
		expect(secondResponse.statusCode).toBe(200);

		const secondSharedWorkflows = await getWorkflowSharing(workflow);
		expect(secondSharedWorkflows).toHaveLength(2);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(2);
	});

	test('PUT /workflows/:id/share should allow sharing by the owner of the workflow', async () => {
		const workflow = await createWorkflow({}, member);

		const response = await authMemberAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [anotherMember.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(2);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(1);
	});

	test('PUT /workflows/:id/share should allow sharing by the instance owner', async () => {
		const workflow = await createWorkflow({}, member);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [anotherMember.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(2);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(1);
	});

	test('PUT /workflows/:id/share should not allow sharing by another shared member', async () => {
		const workflow = await createWorkflow({}, member);

		await shareWorkflowWithUsers(workflow, [anotherMember]);

		const response = await authAnotherMemberAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [anotherMember.id, owner.id] });

		expect(response.statusCode).toBe(403);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(2);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(0);
	});

	test('PUT /workflows/:id/share should not allow sharing with self by another non-shared member', async () => {
		const workflow = await createWorkflow({}, member);

		const response = await authAnotherMemberAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [anotherMember.id] });

		expect(response.statusCode).toBe(403);

		const sharedWorkflows = await getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(1);
		expect(mailer.notifyWorkflowShared).toHaveBeenCalledTimes(0);
	});

	test('PUT /workflows/:id/share should not allow sharing by another non-shared member', async () => {
		const workflow = await createWorkflow({}, member);

		const tempUser = await createUser({ role: 'global:member' });

		const response = await authAnotherMemberAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [tempUser.id] });

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
			.send({ shareWithIds: [member.id] });

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

describe('GET /workflows/:id', () => {
	test('GET should fail with invalid id due to route rule', async () => {
		const response = await authOwnerAgent.get('/workflows/potatoes');

		expect(response.statusCode).toBe(404);
	});

	test('GET should return 404 for non existing workflow', async () => {
		const response = await authOwnerAgent.get('/workflows/9001');

		expect(response.statusCode).toBe(404);
	});

	test('GET should return a workflow with owner', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.ownedBy).toMatchObject({
			id: owner.id,
			email: owner.email,
			firstName: owner.firstName,
			lastName: owner.lastName,
		});

		expect(response.body.data.sharedWith).toHaveLength(0);
	});

	test('GET should return shared workflow with user data', async () => {
		const workflow = await createWorkflow({}, owner);
		await shareWorkflowWithUsers(workflow, [member]);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.ownedBy).toMatchObject({
			id: owner.id,
			email: owner.email,
			firstName: owner.firstName,
			lastName: owner.lastName,
		});

		expect(response.body.data.sharedWith).toHaveLength(1);
		expect(response.body.data.sharedWith[0]).toMatchObject({
			id: member.id,
			email: member.email,
			firstName: member.firstName,
			lastName: member.lastName,
		});
	});

	test('GET should return all sharees', async () => {
		const workflow = await createWorkflow({}, owner);
		await shareWorkflowWithUsers(workflow, [member, anotherMember]);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.ownedBy).toMatchObject({
			id: owner.id,
			email: owner.email,
			firstName: owner.firstName,
			lastName: owner.lastName,
		});

		expect(response.body.data.sharedWith).toHaveLength(2);
	});

	test('GET should return workflow with credentials owned by user', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const workflowPayload = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id, name: savedCredential.name },
		});
		const workflow = await createWorkflow(workflowPayload, owner);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.usedCredentials).toMatchObject([
			{
				id: savedCredential.id,
				name: savedCredential.name,
				currentUserHasAccess: true,
			},
		]);

		expect(response.body.data.sharedWith).toHaveLength(0);
	});

	test('GET should return workflow with credentials saying owner does not have access when not shared', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const workflowPayload = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id, name: savedCredential.name },
		});
		const workflow = await createWorkflow(workflowPayload, owner);

		const response = await authOwnerAgent.get(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.usedCredentials).toMatchObject([
			{
				id: savedCredential.id,
				name: savedCredential.name,
				currentUserHasAccess: false, // although owner can see, they do not have access
			},
		]);

		expect(response.body.data.sharedWith).toHaveLength(0);
	});

	test('GET should return workflow with credentials for all users with or without access', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const workflowPayload = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id, name: savedCredential.name },
		});
		const workflow = await createWorkflow(workflowPayload, member);
		await shareWorkflowWithUsers(workflow, [anotherMember]);

		const responseMember1 = await authMemberAgent.get(`/workflows/${workflow.id}`);
		expect(responseMember1.statusCode).toBe(200);
		expect(responseMember1.body.data.usedCredentials).toMatchObject([
			{
				id: savedCredential.id,
				name: savedCredential.name,
				currentUserHasAccess: true, // one user has access
			},
		]);
		expect(responseMember1.body.data.sharedWith).toHaveLength(1);

		const responseMember2 = await authAnotherMemberAgent.get(`/workflows/${workflow.id}`);
		expect(responseMember2.statusCode).toBe(200);
		expect(responseMember2.body.data.usedCredentials).toMatchObject([
			{
				id: savedCredential.id,
				name: savedCredential.name,
				currentUserHasAccess: false, // the other one doesn't
			},
		]);
		expect(responseMember2.body.data.sharedWith).toHaveLength(1);
	});

	test('GET should return workflow with credentials for all users with access', async () => {
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
		// Both users have access to the credential (none is owner)
		await shareCredentialWithUsers(savedCredential, [anotherMember]);

		const workflowPayload = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id, name: savedCredential.name },
		});
		const workflow = await createWorkflow(workflowPayload, member);
		await shareWorkflowWithUsers(workflow, [anotherMember]);

		const responseMember1 = await authMemberAgent.get(`/workflows/${workflow.id}`);
		expect(responseMember1.statusCode).toBe(200);
		expect(responseMember1.body.data.usedCredentials).toMatchObject([
			{
				id: savedCredential.id,
				name: savedCredential.name,
				currentUserHasAccess: true,
			},
		]);
		expect(responseMember1.body.data.sharedWith).toHaveLength(1);

		const responseMember2 = await authAnotherMemberAgent.get(`/workflows/${workflow.id}`);
		expect(responseMember2.statusCode).toBe(200);
		expect(responseMember2.body.data.usedCredentials).toMatchObject([
			{
				id: savedCredential.id,
				name: savedCredential.name,
				currentUserHasAccess: true,
			},
		]);
		expect(responseMember2.body.data.sharedWith).toHaveLength(1);
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

describe('PATCH /workflows/:id - validate credential permissions to user', () => {
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
		expect(response.statusCode).toBe(400);
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

		await authMemberAgent.put(`/workflows/${id}/share`).send({ shareWithIds: [anotherMember.id] });

		const response = await authAnotherMemberAgent.patch(`/workflows/${id}`).send({
			versionId,
			nodes: changedNodes,
		});

		expect(response.statusCode).toBe(200);
		expect(response.body.data.nodes).toMatchObject(expectedNodes);
	});
});

describe('PATCH /workflows/:id - validate interim updates', () => {
	it('should block owner updating workflow nodes on interim update by member', async () => {
		// owner creates and shares workflow

		const createResponse = await authOwnerAgent.post('/workflows').send(makeWorkflow());
		const { id, versionId: ownerVersionId } = createResponse.body.data;
		await authOwnerAgent.put(`/workflows/${id}/share`).send({ shareWithIds: [member.id] });

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

		await authOwnerAgent.put(`/workflows/${id}/share`).send({ shareWithIds: [member.id] });

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
		await authOwnerAgent.put(`/workflows/${id}/share`).send({ shareWithIds: [member.id] });

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

		await authOwnerAgent.put(`/workflows/${id}/share`).send({ shareWithIds: [member.id] });

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
		await authOwnerAgent.put(`/workflows/${id}/share`).send({ shareWithIds: [member.id] });

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
		await authOwnerAgent.put(`/workflows/${id}/share`).send({ shareWithIds: [member.id] });

		// member accesses workflow

		const memberGetResponse = await authMemberAgent.get(`/workflows/${id}`);
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

describe('getSharedWorkflowIds', () => {
	it('should show all workflows to owners', async () => {
		owner.role = 'global:owner';
		const workflow1 = await createWorkflow({}, member);
		const workflow2 = await createWorkflow({}, anotherMember);
		const sharedWorkflowIds =
			await Container.get(WorkflowSharingService).getSharedWorkflowIds(owner);
		expect(sharedWorkflowIds).toHaveLength(2);
		expect(sharedWorkflowIds).toContain(workflow1.id);
		expect(sharedWorkflowIds).toContain(workflow2.id);
	});

	it('should show shared workflows to users', async () => {
		member.role = 'global:member';
		const workflow1 = await createWorkflow({}, anotherMember);
		const workflow2 = await createWorkflow({}, anotherMember);
		const workflow3 = await createWorkflow({}, anotherMember);
		await shareWorkflowWithUsers(workflow1, [member]);
		await shareWorkflowWithUsers(workflow3, [member]);
		const sharedWorkflowIds =
			await Container.get(WorkflowSharingService).getSharedWorkflowIds(member);
		expect(sharedWorkflowIds).toHaveLength(2);
		expect(sharedWorkflowIds).toContain(workflow1.id);
		expect(sharedWorkflowIds).toContain(workflow3.id);
	});
});

describe('PATCH /workflows/:id - workflow history', () => {
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

describe('PATCH /workflows/:id - activate workflow', () => {
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
