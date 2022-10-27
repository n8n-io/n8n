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
import { INode, INodes } from 'n8n-workflow';

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

describe('PATCH /workflows/:id', () => {
	it('Should succeed when saving unchanged workflow nodes', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: owner });
		const workflow = await createWorkflow(
			{
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
			},
			owner,
		);

		const response = await authAgent(owner).patch(`/workflows/${workflow.id}`).send({
			name: 'new name',
		});

		expect(response.statusCode).toBe(200);
	});

	it('Should allow owner to add node containing credential not shared with the owner', async () => {
		const owner = await testDb.createUser({ globalRole: globalOwnerRole });
		const member = await testDb.createUser({ globalRole: globalMemberRole });

		const savedCredential = await saveCredential(randomCredentialPayload(), { user: member });
		const workflow = await createWorkflow({}, owner);

		const response = await authAgent(owner)
			.patch(`/workflows/${workflow.id}`)
			.send({
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
		const workflow = await createWorkflow({}, member);

		const response = await authAgent(member)
			.patch(`/workflows/${workflow.id}`)
			.send({
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

		const workflow = await createWorkflow({ nodes: originalNodes }, member1);
		await testDb.shareWorkflowWithUsers(workflow, [member2]);

		const response = await authAgent(member2).patch(`/workflows/${workflow.id}`).send({
			nodes: changedNodes,
		});

		expect(response.statusCode).toBe(200);
		expect(response.body.data.nodes).toMatchObject(originalNodes);
	});
});
