import { v4 as uuid } from 'uuid';
import { INodeTypeData, INodeTypes, Workflow } from 'n8n-workflow';

import * as Db from '@/Db';
import * as testDb from '../integration/shared/testDb';
import { NodeTypes as MockNodeTypes } from './Helpers';
import { PermissionChecker } from '@/UserManagement/PermissionChecker';
import {
	randomCredentialPayload as randomCred,
	randomPositiveDigit,
} from '../integration/shared/random';

import type { Role } from '@/databases/entities/Role';
import type { SaveCredentialFunction } from '../integration/shared/types';

let testDbName = '';
let mockNodeTypes: INodeTypes;
let credentialOwnerRole: Role;
let workflowOwnerRole: Role;
let saveCredential: SaveCredentialFunction;

beforeAll(async () => {
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	mockNodeTypes = MockNodeTypes({
		loaded: {
			nodes: MOCK_NODE_TYPES_DATA,
			credentials: {},
		},
		known: { nodes: {}, credentials: {} },
	});

	credentialOwnerRole = await testDb.getCredentialOwnerRole();
	workflowOwnerRole = await testDb.getWorkflowOwnerRole();

	saveCredential = testDb.affixRoleToSaveCredential(credentialOwnerRole);
});

beforeEach(async () => {
	await testDb.truncate(['SharedWorkflow', 'SharedCredentials'], testDbName);
	await testDb.truncate(['User', 'Workflow', 'Credentials'], testDbName);
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

describe('PermissionChecker.check()', () => {
	test('should allow if workflow has no creds', async () => {
		const userId = uuid();

		const workflow = new Workflow({
			id: randomPositiveDigit().toString(),
			name: 'test',
			active: false,
			connections: {},
			nodeTypes: mockNodeTypes,
			nodes: [
				{
					id: uuid(),
					name: 'Start',
					type: 'n8n-nodes-base.start',
					typeVersion: 1,
					parameters: {},
					position: [0, 0],
				},
			],
		});

		expect(() => PermissionChecker.check(workflow, userId)).not.toThrow();
	});

	test('should allow if requesting user is instance owner', async () => {
		const owner = await testDb.createOwner();

		const workflow = new Workflow({
			id: randomPositiveDigit().toString(),
			name: 'test',
			active: false,
			connections: {},
			nodeTypes: mockNodeTypes,
			nodes: [
				{
					id: uuid(),
					name: 'Action Network',
					type: 'n8n-nodes-base.actionNetwork',
					parameters: {},
					typeVersion: 1,
					position: [0, 0],
					credentials: {
						actionNetworkApi: {
							id: randomPositiveDigit().toString(),
							name: 'Action Network Account',
						},
					},
				},
			],
		});

		expect(async () => await PermissionChecker.check(workflow, owner.id)).not.toThrow();
	});

	test('should allow if workflow creds are valid subset', async () => {
		const [owner, member] = await Promise.all([testDb.createOwner(), testDb.createUser()]);

		const ownerCred = await saveCredential(randomCred(), { user: owner });
		const memberCred = await saveCredential(randomCred(), { user: member });

		const workflow = new Workflow({
			id: randomPositiveDigit().toString(),
			name: 'test',
			active: false,
			connections: {},
			nodeTypes: mockNodeTypes,
			nodes: [
				{
					id: uuid(),
					name: 'Action Network',
					type: 'n8n-nodes-base.actionNetwork',
					parameters: {},
					typeVersion: 1,
					position: [0, 0],
					credentials: {
						actionNetworkApi: {
							id: ownerCred.id.toString(),
							name: ownerCred.name,
						},
					},
				},
				{
					id: uuid(),
					name: 'Action Network 2',
					type: 'n8n-nodes-base.actionNetwork',
					parameters: {},
					typeVersion: 1,
					position: [0, 0],
					credentials: {
						actionNetworkApi: {
							id: memberCred.id.toString(),
							name: memberCred.name,
						},
					},
				},
			],
		});

		expect(async () => await PermissionChecker.check(workflow, owner.id)).not.toThrow();
	});

	test('should deny if workflow creds are not valid subset', async () => {
		const member = await testDb.createUser();

		const memberCred = await saveCredential(randomCred(), { user: member });

		const workflowDetails = {
			id: randomPositiveDigit(),
			name: 'test',
			active: false,
			connections: {},
			nodeTypes: mockNodeTypes,
			nodes: [
				{
					id: uuid(),
					name: 'Action Network',
					type: 'n8n-nodes-base.actionNetwork',
					parameters: {},
					typeVersion: 1,
					position: [0, 0] as [number, number],
					credentials: {
						actionNetworkApi: {
							id: memberCred.id.toString(),
							name: memberCred.name,
						},
					},
				},
				{
					id: uuid(),
					name: 'Action Network 2',
					type: 'n8n-nodes-base.actionNetwork',
					parameters: {},
					typeVersion: 1,
					position: [0, 0] as [number, number],
					credentials: {
						actionNetworkApi: {
							id: 'non-existing-credential-id',
							name: 'Non-existing credential name',
						},
					},
				},
			],
		};

		const workflowEntity = await Db.collections.Workflow.save(workflowDetails);

		await Db.collections.SharedWorkflow.save({
			workflow: workflowEntity,
			user: member,
			role: workflowOwnerRole,
		});

		const workflow = new Workflow({ ...workflowDetails, id: workflowDetails.id.toString() });

		expect(PermissionChecker.check(workflow, member.id)).rejects.toThrow();
	});
});

const MOCK_NODE_TYPES_DATA = ['start', 'actionNetwork'].reduce<INodeTypeData>((acc, nodeName) => {
	return (
		(acc[`n8n-nodes-base.${nodeName}`] = {
			sourcePath: '',
			type: {
				description: {
					displayName: nodeName,
					name: nodeName,
					group: [],
					description: '',
					version: 1,
					defaults: {},
					inputs: [],
					outputs: [],
					properties: [],
				},
			},
		}),
		acc
	);
}, {});
