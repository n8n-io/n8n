import express from 'express';

import * as utils from './shared/utils';
import * as testDb from './shared/testDb';
import { createWorkflow } from './shared/testDb';
import * as UserManagementHelpers from '../../src/UserManagement/UserManagementHelper';
import { v4 as uuid } from 'uuid';

import type { Role } from '../../src/databases/entities/Role';
import config from '../../config';
import type { AuthAgent, SaveCredentialFunction } from './shared/types';
import { makeWorkflow } from './shared/utils';
import { randomCredentialPayload } from './shared/random';
import { ActiveWorkflowRunner } from '../../src';
import { INode } from 'n8n-workflow';

jest.mock('../../src/telemetry');

// mock whether sharing is enabled or not
jest.spyOn(UserManagementHelpers, 'isSharingEnabled').mockReturnValue(true);

let app: express.Application;
let testDbName = '';

let globalOwnerRole: Role;
let globalMemberRole: Role;
let credentialOwnerRole: Role;
let authAgent: AuthAgent;
let saveCredential: SaveCredentialFunction;
let workflowRunner: ActiveWorkflowRunner.ActiveWorkflowRunner;

beforeAll(async () => {
	app = await utils.initTestServer({
		endpointGroups: ['workflows'],
		applyAuth: true,
	});
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	globalMemberRole = await testDb.getGlobalMemberRole();
	credentialOwnerRole = await testDb.getCredentialOwnerRole();

	saveCredential = testDb.affixRoleToSaveCredential(credentialOwnerRole);

	authAgent = utils.createAuthAgent(app);

	utils.initTestLogger();
	utils.initTestTelemetry();

	config.set('enterprise.workflowSharingEnabled', true);

	await utils.initNodeTypes();
	workflowRunner = await utils.initActiveWorkflowRunner();
});

beforeEach(async () => {
	await testDb.truncate(['User', 'Workflow', 'SharedWorkflow'], testDbName);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

describe('PUT /workflows/:id', () => {
	test('PUT /workflows/:id/share should save sharing with new users', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });
		const workflow = await createWorkflow({}, owner);

		const response = await authAgent(owner)
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [member.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await testDb.getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(2);
	});

	test('PUT /workflows/:id/share should succeed when sharing with invalid user-id', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const workflow = await createWorkflow({}, owner);

		const response = await authAgent(owner)
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [uuid()] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await testDb.getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(1);
	});

	test('PUT /workflows/:id/share should allow sharing with multiple users', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });
		const anotherMember = await testDb.createUser({ globalRole: globalMemberRole });
		const workflow = await createWorkflow({}, owner);

		const response = await authAgent(owner)
			.put(`/workflows/${workflow.id}/share`)
			.send({ shareWithIds: [member.id, anotherMember.id] });

		expect(response.statusCode).toBe(200);

		const sharedWorkflows = await testDb.getWorkflowSharing(workflow);
		expect(sharedWorkflows).toHaveLength(3);
	});

	test('PUT /workflows/:id/share should override sharing', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });
		const anotherMember = await testDb.createUser({ globalRole: globalMemberRole });
		const workflow = await createWorkflow({}, owner);

		const authOwnerAgent = authAgent(owner);

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

describe('GET /workflows/:id', () => {
	test('GET should fail with invalid id due to route rule', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });

		const response = await authAgent(owner).get('/workflows/potatoes');

		expect(response.statusCode).toBe(404);
	});

	test('GET should return 404 for non existing workflow', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });

		const response = await authAgent(owner).get('/workflows/9001');

		expect(response.statusCode).toBe(404);
	});

	test('GET should return a workflow with owner', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const workflow = await createWorkflow({}, owner);

		const response = await authAgent(owner).get(`/workflows/${workflow.id}`);

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
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });
		const workflow = await createWorkflow({}, owner);
		await testDb.shareWorkflowWithUsers(workflow, [member]);

		const response = await authAgent(owner).get(`/workflows/${workflow.id}`);

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
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member1 = await testDb.createUser({ globalRole: globalMemberRole });
		const member2 = await testDb.createUser({ globalRole: globalMemberRole });
		const workflow = await createWorkflow({}, owner);
		await testDb.shareWorkflowWithUsers(workflow, [member1, member2]);

		const response = await authAgent(owner).get(`/workflows/${workflow.id}`);

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
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });

		const workflowPayload = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id.toString(), name: savedCredential.name },
		});
		const workflow = await createWorkflow(workflowPayload, owner);

		const response = await authAgent(owner).get(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.usedCredentials).toMatchObject([
			{
				id: savedCredential.id.toString(),
				name: savedCredential.name,
				currentUserHasAccess: true,
			},
		]);

		expect(response.body.data.sharedWith).toHaveLength(0);
	});

	test('GET should return workflow with credentials saying owner has access even when not shared', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });

		const workflowPayload = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id.toString(), name: savedCredential.name },
		});
		const workflow = await createWorkflow(workflowPayload, owner);

		const response = await authAgent(owner).get(`/workflows/${workflow.id}`);

		expect(response.statusCode).toBe(200);
		expect(response.body.data.usedCredentials).toMatchObject([
			{
				id: savedCredential.id.toString(),
				name: savedCredential.name,
				currentUserHasAccess: true, // owner has access to any cred
			},
		]);

		expect(response.body.data.sharedWith).toHaveLength(0);
	});

	test('GET should return workflow with credentials for all users with or without access', async () => {
		const member1 = await testDb.createUser({ globalRole: globalMemberRole });
		const member2 = await testDb.createUser({ globalRole: globalMemberRole });
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member1 });

		const workflowPayload = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id.toString(), name: savedCredential.name },
		});
		const workflow = await createWorkflow(workflowPayload, member1);
		await testDb.shareWorkflowWithUsers(workflow, [member2]);

		const responseMember1 = await authAgent(member1).get(`/workflows/${workflow.id}`);
		expect(responseMember1.statusCode).toBe(200);
		expect(responseMember1.body.data.usedCredentials).toMatchObject([
			{
				id: savedCredential.id.toString(),
				name: savedCredential.name,
				currentUserHasAccess: true, // one user has access
			},
		]);
		expect(responseMember1.body.data.sharedWith).toHaveLength(1);

		const responseMember2 = await authAgent(member2).get(`/workflows/${workflow.id}`);
		expect(responseMember2.statusCode).toBe(200);
		expect(responseMember2.body.data.usedCredentials).toMatchObject([
			{
				id: savedCredential.id.toString(),
				name: savedCredential.name,
				currentUserHasAccess: false, // the other one doesn't
			},
		]);
		expect(responseMember2.body.data.sharedWith).toHaveLength(1);
	});

	test('GET should return workflow with credentials for all users with access', async () => {
		const member1 = await testDb.createUser({ globalRole: globalMemberRole });
		const member2 = await testDb.createUser({ globalRole: globalMemberRole });
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member1 });
		// Both users have access to the credential (none is owner)
		await testDb.shareCredentialWithUsers(savedCredential, [member2]);

		const workflowPayload = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id.toString(), name: savedCredential.name },
		});
		const workflow = await createWorkflow(workflowPayload, member1);
		await testDb.shareWorkflowWithUsers(workflow, [member2]);

		const responseMember1 = await authAgent(member1).get(`/workflows/${workflow.id}`);
		expect(responseMember1.statusCode).toBe(200);
		expect(responseMember1.body.data.usedCredentials).toMatchObject([
			{
				id: savedCredential.id.toString(),
				name: savedCredential.name,
				currentUserHasAccess: true,
			},
		]);
		expect(responseMember1.body.data.sharedWith).toHaveLength(1);

		const responseMember2 = await authAgent(member2).get(`/workflows/${workflow.id}`);
		expect(responseMember2.statusCode).toBe(200);
		expect(responseMember2.body.data.usedCredentials).toMatchObject([
			{
				id: savedCredential.id.toString(),
				name: savedCredential.name,
				currentUserHasAccess: true,
			},
		]);
		expect(responseMember2.body.data.sharedWith).toHaveLength(1);
	});
});

describe('POST /workflows', () => {
	it('Should create a workflow that uses no credential', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });

		const workflow = makeWorkflow({ withPinData: false });

		const response = await authAgent(owner).post('/workflows').send(workflow);

		expect(response.statusCode).toBe(200);
	});

	it('Should save a new workflow with credentials', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
		const workflow = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id.toString(), name: savedCredential.name },
		});

		const response = await authAgent(owner).post('/workflows').send(workflow);

		expect(response.statusCode).toBe(200);
	});

	it('Should not allow saving a workflow using credential you have no access', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });

		// Credential belongs to owner, member cannot use it.
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
		const workflow = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id.toString(), name: savedCredential.name },
		});

		const response = await authAgent(member).post('/workflows').send(workflow);

		expect(response.statusCode).toBe(400);
		expect(response.body.message).toBe(
			'The workflow contains credentials that you do not have access to',
		);
	});

	it('Should allow owner to save a workflow using credential owned by others', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });

		// Credential belongs to owner, member cannot use it.
		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
		const workflow = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id.toString(), name: savedCredential.name },
		});

		const response = await authAgent(owner).post('/workflows').send(workflow);

		expect(response.statusCode).toBe(200);
	});

	it('Should allow saving a workflow using a credential owned by others and shared with you', async () => {
		const member1 = await testDb.createUser({ globalRole: globalMemberRole });
		const member2 = await testDb.createUser({ globalRole: globalMemberRole });

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member1 });
		await testDb.shareCredentialWithUsers(savedCredential, [member2]);

		const workflow = makeWorkflow({
			withPinData: false,
			withCredential: { id: savedCredential.id.toString(), name: savedCredential.name },
		});

		const response = await authAgent(member2).post('/workflows').send(workflow);
		expect(response.statusCode).toBe(200);
	});
});

describe('PATCH /workflows/:id - validate credential permissions to user', () => {
	it('Should succeed when saving unchanged workflow nodes', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });

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
							id: savedCredential.id.toString(),
							name: savedCredential.name,
						},
					},
				},
			],
		};

		const createResponse = await authAgent(owner).post('/workflows').send(workflow);
		const { id, hash } = createResponse.body.data;

		const response = await authAgent(owner).patch(`/workflows/${id}`).send({
			name: 'new name',
			hash,
		});

		expect(response.statusCode).toBe(200);
	});

	it('Should allow owner to add node containing credential not shared with the owner', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });

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
							id: savedCredential.id.toString(),
							name: savedCredential.name,
						},
					},
				},
			],
		};

		const createResponse = await authAgent(owner).post('/workflows').send(workflow);
		const { id, hash } = createResponse.body.data;

		const response = await authAgent(owner)
			.patch(`/workflows/${id}`)
			.send({
				hash,
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
								id: savedCredential.id.toString(),
								name: savedCredential.name,
							},
						},
					},
				],
			});

		expect(response.statusCode).toBe(200);
	});

	it('Should prevent member from adding node containing credential inaccessible to member', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });

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
							id: savedCredential.id.toString(),
							name: savedCredential.name,
						},
					},
				},
			],
		};

		const createResponse = await authAgent(owner).post('/workflows').send(workflow);
		const { id, hash } = createResponse.body.data;

		const response = await authAgent(member)
			.patch(`/workflows/${id}`)
			.send({
				hash,
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
								id: savedCredential.id.toString(),
								name: savedCredential.name,
							},
						},
					},
				],
			});

		expect(response.statusCode).toBe(400);
	});

	it('Should succeed but prevent modifying nodes that are read-only for the requester', async () => {
		const member1 = await testDb.createUser({ globalRole: globalMemberRole });
		const member2 = await testDb.createUser({ globalRole: globalMemberRole });

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member1 });

		const originalNodes: INode[] = [
			{
				id: 'uuid-1234',
				name: 'Start',
				parameters: {},
				position: [-20, 260],
				type: 'n8n-nodes-base.start',
				typeVersion: 1,
				credentials: {
					default: {
						id: savedCredential.id.toString(),
						name: savedCredential.name,
					},
				},
			},
		];

		const changedNodes: INode[] = [
			{
				id: 'uuid-1234',
				name: 'End',
				parameters: {},
				position: [-20, 260],
				type: 'n8n-nodes-base.no-op',
				typeVersion: 1,
				credentials: {
					default: {
						id: '200',
						name: 'fake credential',
					},
				},
			},
		];

		const workflow = {
			name: 'test',
			active: false,
			connections: {},
			nodes: originalNodes,
		};

		const createResponse = await authAgent(member1).post('/workflows').send(workflow);
		const { id, hash } = createResponse.body.data;

		await authAgent(member1)
			.put(`/workflows/${id}/share`)
			.send({ shareWithIds: [member2.id] });

		const response = await authAgent(member2).patch(`/workflows/${id}`).send({
			hash,
			nodes: changedNodes,
		});

		expect(response.statusCode).toBe(200);
		expect(response.body.data.nodes).toMatchObject(originalNodes);
	});
});

describe('PATCH /workflows/:id - validate interim updates', () => {
	it('should block owner updating workflow nodes on interim update by member', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });

		// owner creates and shares workflow

		const createResponse = await authAgent(owner).post('/workflows').send(makeWorkflow());
		const { id, hash: ownerHash } = createResponse.body.data;
		await authAgent(owner)
			.put(`/workflows/${id}/share`)
			.send({ shareWithIds: [member.id] });

		// member accesses and updates workflow name

		const memberGetResponse = await authAgent(member).get(`/workflows/${id}`);
		const { hash: memberHash } = memberGetResponse.body.data;

		await authAgent(member)
			.patch(`/workflows/${id}`)
			.send({ name: 'Update by member', hash: memberHash });

		// owner blocked from updating workflow nodes

		const updateAttemptResponse = await authAgent(owner)
			.patch(`/workflows/${id}`)
			.send({ nodes: [], hash: ownerHash });

		expect(updateAttemptResponse.status).toBe(400);
		expect(updateAttemptResponse.body.message).toContain(
			'cannot be saved because it was changed by another user',
		);
	});

	it('should block member updating workflow nodes on interim update by owner', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });

		// owner creates, updates and shares workflow

		const createResponse = await authAgent(owner).post('/workflows').send(makeWorkflow());
		const { id, hash: ownerFirstHash } = createResponse.body.data;

		const updateResponse = await authAgent(owner)
			.patch(`/workflows/${id}`)
			.send({ name: 'Update by owner', hash: ownerFirstHash });

		const { hash: ownerSecondHash } = updateResponse.body.data;

		await authAgent(owner)
			.put(`/workflows/${id}/share`)
			.send({ shareWithIds: [member.id] });

		// member accesses workflow

		const memberGetResponse = await authAgent(member).get(`/workflows/${id}`);
		const { hash: memberHash } = memberGetResponse.body.data;

		// owner re-updates workflow

		await authAgent(owner)
			.patch(`/workflows/${id}`)
			.send({ name: 'Owner update again', hash: ownerSecondHash });

		// member blocked from updating workflow

		const updateAttemptResponse = await authAgent(member)
			.patch(`/workflows/${id}`)
			.send({ nodes: [], hash: memberHash });

		expect(updateAttemptResponse.status).toBe(400);
		expect(updateAttemptResponse.body.message).toContain(
			'cannot be saved because it was changed by another user',
		);
	});

	it('should block owner activation on interim activation by member', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });

		// owner creates and shares workflow

		const createResponse = await authAgent(owner).post('/workflows').send(makeWorkflow());
		const { id, hash: ownerHash } = createResponse.body.data;
		await authAgent(owner)
			.put(`/workflows/${id}/share`)
			.send({ shareWithIds: [member.id] });

		// member accesses and activates workflow

		const memberGetResponse = await authAgent(member).get(`/workflows/${id}`);
		const { hash: memberHash } = memberGetResponse.body.data;
		await authAgent(member).patch(`/workflows/${id}`).send({ active: true, hash: memberHash });

		// owner blocked from activating workflow

		const activationAttemptResponse = await authAgent(owner)
			.patch(`/workflows/${id}`)
			.send({ active: true, hash: ownerHash });

		expect(activationAttemptResponse.status).toBe(400);
		expect(activationAttemptResponse.body.message).toContain(
			'cannot be saved because it was changed by another user',
		);
	});

	it('should block member activation on interim activation by owner', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });

		// owner creates, updates and shares workflow

		const createResponse = await authAgent(owner).post('/workflows').send(makeWorkflow());
		const { id, hash: ownerFirstHash } = createResponse.body.data;

		const updateResponse = await authAgent(owner)
			.patch(`/workflows/${id}`)
			.send({ name: 'Update by owner', hash: ownerFirstHash });
		const { hash: ownerSecondHash } = updateResponse.body.data;

		await authAgent(owner)
			.put(`/workflows/${id}/share`)
			.send({ shareWithIds: [member.id] });

		// member accesses workflow

		const memberGetResponse = await authAgent(member).get(`/workflows/${id}`);
		const { hash: memberHash } = memberGetResponse.body.data;

		// owner activates workflow

		await authAgent(owner).patch(`/workflows/${id}`).send({ active: true, hash: ownerSecondHash });

		// member blocked from activating workflow

		const updateAttemptResponse = await authAgent(member)
			.patch(`/workflows/${id}`)
			.send({ active: true, hash: memberHash });

		expect(updateAttemptResponse.status).toBe(400);
		expect(updateAttemptResponse.body.message).toContain(
			'cannot be saved because it was changed by another user',
		);
	});

	it('should block member updating workflow settings on interim update by owner', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });

		// owner creates and shares workflow

		const createResponse = await authAgent(owner).post('/workflows').send(makeWorkflow());
		const { id, hash: ownerHash } = createResponse.body.data;
		await authAgent(owner)
			.put(`/workflows/${id}/share`)
			.send({ shareWithIds: [member.id] });

		// member accesses workflow

		const memberGetResponse = await authAgent(member).get(`/workflows/${id}`);
		const { hash: memberHash } = memberGetResponse.body.data;

		// owner updates workflow name

		await authAgent(owner)
			.patch(`/workflows/${id}`)
			.send({ name: 'Another name', hash: ownerHash });

		// member blocked from updating workflow settings

		const updateAttemptResponse = await authAgent(member)
			.patch(`/workflows/${id}`)
			.send({ settings: { saveManualExecutions: true }, hash: memberHash });

		expect(updateAttemptResponse.status).toBe(400);
		expect(updateAttemptResponse.body.message).toContain(
			'cannot be saved because it was changed by another user',
		);
	});

	it('should block member updating workflow name on interim update by owner', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });

		// owner creates and shares workflow

		const createResponse = await authAgent(owner).post('/workflows').send(makeWorkflow());
		const { id, hash: ownerHash } = createResponse.body.data;
		await authAgent(owner)
			.put(`/workflows/${id}/share`)
			.send({ shareWithIds: [member.id] });

		// member accesses workflow

		const memberGetResponse = await authAgent(member).get(`/workflows/${id}`);
		const { hash: memberHash } = memberGetResponse.body.data;

		// owner updates workflow settings

		await authAgent(owner)
			.patch(`/workflows/${id}`)
			.send({ settings: { saveManualExecutions: true }, hash: ownerHash });

		// member blocked from updating workflow name

		const updateAttemptResponse = await authAgent(member)
			.patch(`/workflows/${id}`)
			.send({ settings: { saveManualExecutions: true }, hash: memberHash });

		expect(updateAttemptResponse.status).toBe(400);
		expect(updateAttemptResponse.body.message).toContain(
			'cannot be saved because it was changed by another user',
		);
	});
});
