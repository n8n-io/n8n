import type { SuperAgentTest } from 'supertest';
import { v4 as uuid } from 'uuid';
import type { INode } from 'n8n-workflow';

import * as UserManagementHelpers from '@/UserManagement/UserManagementHelper';
import type { User } from '@db/entities/User';
import { getSharedWorkflowIds } from '@/WorkflowHelpers';

import * as utils from './shared/utils/';
import * as testDb from './shared/testDb';
import { createWorkflow, getGlobalMemberRole, getGlobalOwnerRole } from './shared/testDb';
import type { SaveCredentialFunction } from './shared/types';
import { makeWorkflow } from './shared/utils/';
import { randomCredentialPayload } from './shared/random';

let owner: User;
let member: User;
let anotherMember: User;
let authOwnerAgent: SuperAgentTest;
let authMemberAgent: SuperAgentTest;
let authAnotherMemberAgent: SuperAgentTest;
let saveCredential: SaveCredentialFunction;

const sharingSpy = jest.spyOn(UserManagementHelpers, 'isSharingEnabled').mockReturnValue(true);
const testServer = utils.setupTestServer({
	endpointGroups: ['workflows'],
	enabledFeatures: ['feat:sharing'],
});

beforeAll(async () => {
	const globalOwnerRole = await testDb.getGlobalOwnerRole();
	const globalMemberRole = await testDb.getGlobalMemberRole();
	const credentialOwnerRole = await testDb.getCredentialOwnerRole();

	owner = await testDb.createUser({ globalRole: globalOwnerRole });
	member = await testDb.createUser({ globalRole: globalMemberRole });
	anotherMember = await testDb.createUser({ globalRole: globalMemberRole });

	authOwnerAgent = testServer.authAgentFor(owner);
	authMemberAgent = testServer.authAgentFor(member);
	authAnotherMemberAgent = testServer.authAgentFor(anotherMember);

	saveCredential = testDb.affixRoleToSaveCredential(credentialOwnerRole);

	await utils.initNodeTypes();
});

beforeEach(async () => {
	await testDb.truncate(['Workflow', 'SharedWorkflow']);
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

		const sharedWorkflows = await testDb.getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(2);
	});

	test('PUT /workflows/:id/share should succeed when sharing with invalid user-id', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [uuid()] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await testDb.getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(1);
	});

	test('PUT /workflows/:id/share should allow sharing with multiple users', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [member.id, anotherMember.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await testDb.getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(3);
	});

	test('PUT /workflows/:id/share should override sharing', async () => {
		const workflow = await createWorkflow({}, owner);

		const response = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [member.id, anotherMember.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await testDb.getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(3);

		const secondResponse = await authOwnerAgent
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [member.id] });
		expect(secondResponse.statusCode).toBe(200);

		const secondSharedWorkflows = await testDb.getWorkflowSharing(workflow);
		expect(secondSharedWorkflows).toHaveLength(2);
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
		await testDb.shareWorkflowWithUsers(workflow, [member]);

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
		await testDb.shareWorkflowWithUsers(workflow, [member, anotherMember]);

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
		await testDb.shareWorkflowWithUsers(workflow, [anotherMember]);

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
		await testDb.shareCredentialWithUsers(savedCredential, [anotherMember]);

		const workflowPayload = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id, name: savedCredential.name },
		});
		const workflow = await createWorkflow(workflowPayload, member);
		await testDb.shareWorkflowWithUsers(workflow, [anotherMember]);

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
		await testDb.shareCredentialWithUsers(savedCredential, [anotherMember]);

		const workflow = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id, name: savedCredential.name },
		});

		const response = await authAnotherMemberAgent.post('/workflows').send(workflow);
		expect(response.statusCode).toBe(200);
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
		owner.globalRole = await getGlobalOwnerRole();
		const workflow1 = await createWorkflow({}, member);
		const workflow2 = await createWorkflow({}, anotherMember);
		const sharedWorkflowIds = await getSharedWorkflowIds(owner);
		expect(sharedWorkflowIds).toHaveLength(2);
		expect(sharedWorkflowIds).toContain(workflow1.id);
		expect(sharedWorkflowIds).toContain(workflow2.id);
	});

	it('should show shared workflows to users', async () => {
		member.globalRole = await getGlobalMemberRole();
		const workflow1 = await createWorkflow({}, anotherMember);
		const workflow2 = await createWorkflow({}, anotherMember);
		const workflow3 = await createWorkflow({}, anotherMember);
		await testDb.shareWorkflowWithUsers(workflow1, [member]);
		await testDb.shareWorkflowWithUsers(workflow3, [member]);
		const sharedWorkflowIds = await getSharedWorkflowIds(member);
		expect(sharedWorkflowIds).toHaveLength(2);
		expect(sharedWorkflowIds).toContain(workflow1.id);
		expect(sharedWorkflowIds).toContain(workflow3.id);
	});
});
