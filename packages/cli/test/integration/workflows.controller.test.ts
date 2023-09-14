import type { SuperAgentTest } from 'supertest';
import type { INode, IPinData } from 'n8n-workflow';
import * as UserManagementHelpers from '@/UserManagement/UserManagementHelper';

import * as utils from './shared/utils/';
import * as testDb from './shared/testDb';
import { makeWorkflow, MOCK_PINDATA } from './shared/utils/';
import type { User } from '@/databases/entities/User';
import { randomCredentialPayload } from './shared/random';
import { v4 as uuid } from 'uuid';
import { RoleService } from '@/services/role.service';
import Container from 'typedi';
import type { ListQuery } from '@/requests';

let owner: User;
let authOwnerAgent: SuperAgentTest;

jest.spyOn(UserManagementHelpers, 'isSharingEnabled').mockReturnValue(false);
const testServer = utils.setupTestServer({ endpointGroups: ['workflows'] });

const { objectContaining, arrayContaining, any } = expect;

beforeAll(async () => {
	owner = await testDb.createOwner();
	authOwnerAgent = testServer.authAgentFor(owner);
});

beforeEach(async () => {
	await testDb.truncate(['Workflow', 'SharedWorkflow', 'Tag']);
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
});

describe('GET /workflows/:id', () => {
	test('should return pin data', async () => {
		const workflow = makeWorkflow({ withPinData: true });
		const workflowCreationResponse = await authOwnerAgent.post('/workflows').send(workflow);

		const { id } = workflowCreationResponse.body.data as { id: string };
		const workflowRetrievalResponse = await authOwnerAgent.get(`/workflows/${id}`);

		expect(workflowRetrievalResponse.statusCode).toBe(200);
		const { pinData } = workflowRetrievalResponse.body.data as { pinData: IPinData };
		expect(pinData).toMatchObject(MOCK_PINDATA);
	});
});

describe('GET /workflows', () => {
	test('should return zero workflows if none exist', async () => {
		const response = await authOwnerAgent.get('/workflows').expect(200);

		expect(response.body).toEqual({ count: 0, data: [] });
	});

	test('should return workflows', async () => {
		const credential = await testDb.saveCredential(randomCredentialPayload(), {
			user: owner,
			role: await Container.get(RoleService).findCredentialOwnerRole(),
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

		const tag = await testDb.createTag({ name: 'A' });

		await testDb.createWorkflow({ name: 'First', nodes, tags: [tag] }, owner);
		await testDb.createWorkflow({ name: 'Second' }, owner);

		const response = await authOwnerAgent.get('/workflows').expect(200);

		expect(response.body).toEqual({
			count: 2,
			data: arrayContaining([
				objectContaining({
					id: any(String),
					name: 'First',
					active: any(Boolean),
					createdAt: any(String),
					updatedAt: any(String),
					tags: [{ id: any(String), name: 'A' }],
					versionId: null,
					ownedBy: { id: owner.id },
				}),
				objectContaining({
					id: any(String),
					name: 'Second',
					active: any(Boolean),
					createdAt: any(String),
					updatedAt: any(String),
					tags: [],
					versionId: null,
					ownedBy: { id: owner.id },
				}),
			]),
		});

		const found = response.body.data.find(
			(w: ListQuery.Workflow.WithOwnership) => w.name === 'First',
		);

		expect(found.nodes).toBeUndefined();
		expect(found.sharedWith).toBeUndefined();
		expect(found.usedCredentials).toBeUndefined();
	});

	describe('filter', () => {
		test('should filter workflows by field: name', async () => {
			await testDb.createWorkflow({ name: 'First' }, owner);
			await testDb.createWorkflow({ name: 'Second' }, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={"name":"First"}')
				.expect(200);

			expect(response.body).toEqual({
				count: 1,
				data: [objectContaining({ name: 'First' })],
			});
		});

		test('should filter workflows by field: active', async () => {
			await testDb.createWorkflow({ active: true }, owner);
			await testDb.createWorkflow({ active: false }, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "active": true }')
				.expect(200);

			expect(response.body).toEqual({
				count: 1,
				data: [objectContaining({ active: true })],
			});
		});

		test('should filter workflows by field: tags', async () => {
			const workflow = await testDb.createWorkflow({ name: 'First' }, owner);

			await testDb.createTag({ name: 'A' }, workflow);
			await testDb.createTag({ name: 'B' }, workflow);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('filter={ "tags": ["A"] }')
				.expect(200);

			expect(response.body).toEqual({
				count: 1,
				data: [objectContaining({ name: 'First', tags: [{ id: any(String), name: 'A' }] })],
			});
		});
	});

	describe('select', () => {
		test('should select workflow field: name', async () => {
			await testDb.createWorkflow({ name: 'First' }, owner);
			await testDb.createWorkflow({ name: 'Second' }, owner);

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
			await testDb.createWorkflow({ active: true }, owner);
			await testDb.createWorkflow({ active: false }, owner);

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

		test('should select workflow field: tags', async () => {
			const firstWorkflow = await testDb.createWorkflow({ name: 'First' }, owner);
			const secondWorkflow = await testDb.createWorkflow({ name: 'Second' }, owner);

			await testDb.createTag({ name: 'A' }, firstWorkflow);
			await testDb.createTag({ name: 'B' }, secondWorkflow);

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

			await testDb.createWorkflow(
				{
					createdAt: new Date(firstWorkflowCreatedAt),
					updatedAt: new Date(firstWorkflowUpdatedAt),
				},
				owner,
			);
			await testDb.createWorkflow(
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

			await testDb.createWorkflow({ versionId: firstWorkflowVersionId }, owner);
			await testDb.createWorkflow({ versionId: secondWorkflowVersionId }, owner);

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
			await testDb.createWorkflow({}, owner);
			await testDb.createWorkflow({}, owner);

			const response = await authOwnerAgent
				.get('/workflows')
				.query('select=["ownedBy"]')
				.expect(200);

			expect(response.body).toEqual({
				count: 2,
				data: arrayContaining([
					{ id: any(String), ownedBy: { id: owner.id } },
					{ id: any(String), ownedBy: { id: owner.id } },
				]),
			});
		});
	});
});
