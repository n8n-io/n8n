import { v4 as uuid } from 'uuid';
import {
	ICredentialTypes,
	INodeTypeData,
	INodeTypes,
	SubworkflowOperationError,
	Workflow,
} from 'n8n-workflow';

import config from '@/config';
import * as Db from '@/Db';
import * as testDb from '../integration/shared/testDb';
import { NodeTypes as MockNodeTypes } from './Helpers';
import { UserService } from '@/user/user.service';
import { PermissionChecker } from '@/UserManagement/PermissionChecker';
import * as UserManagementHelper from '@/UserManagement/UserManagementHelper';
import { WorkflowsService } from '@/workflows/workflows.services';
import {
	randomCredentialPayload as randomCred,
	randomPositiveDigit,
} from '../integration/shared/random';

import { Role } from '@/databases/entities/Role';
import type { SaveCredentialFunction } from '../integration/shared/types';
import { User } from '@/databases/entities/User';
import { SharedWorkflow } from '@/databases/entities/SharedWorkflow';

let mockNodeTypes: INodeTypes;
let credentialOwnerRole: Role;
let workflowOwnerRole: Role;
let saveCredential: SaveCredentialFunction;

beforeAll(async () => {
	await testDb.init();

	mockNodeTypes = MockNodeTypes({
		loaded: {
			nodes: MOCK_NODE_TYPES_DATA,
			credentials: {},
		},
		known: { nodes: {}, credentials: {} },
		credentialTypes: {} as ICredentialTypes,
	});

	credentialOwnerRole = await testDb.getCredentialOwnerRole();
	workflowOwnerRole = await testDb.getWorkflowOwnerRole();

	saveCredential = testDb.affixRoleToSaveCredential(credentialOwnerRole);
});

beforeEach(async () => {
	await testDb.truncate(['SharedWorkflow', 'SharedCredentials']);
	await testDb.truncate(['User', 'Workflow', 'Credentials']);
});

afterAll(async () => {
	await testDb.terminate();
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
							id: ownerCred.id,
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
							id: memberCred.id,
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
					position: [0, 0] as [number, number],
					credentials: {
						actionNetworkApi: {
							id: memberCred.id,
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

		const workflow = new Workflow(workflowDetails);

		expect(PermissionChecker.check(workflow, member.id)).rejects.toThrow();
	});
});

describe('PermissionChecker.checkSubworkflowExecutePolicy', () => {
	const userId = uuid();
	const fakeUser = new User();
	fakeUser.id = userId;

	const ownerMockRole = new Role();
	ownerMockRole.name = 'owner';
	const sharedWorkflowOwner = new SharedWorkflow();
	sharedWorkflowOwner.role = ownerMockRole;

	const nonOwnerMockRole = new Role();
	nonOwnerMockRole.name = 'editor';
	const sharedWorkflowNotOwner = new SharedWorkflow();
	sharedWorkflowNotOwner.role = nonOwnerMockRole;

	test('sets default policy from environment when subworkflow has none', async () => {
		config.set('workflows.callerPolicyDefaultOption', 'none');
		jest.spyOn(UserManagementHelper, 'getWorkflowOwner').mockImplementation(async (workflowId) => {
			return fakeUser;
		});
		jest.spyOn(UserManagementHelper, 'isSharingEnabled').mockReturnValue(true);

		const subworkflow = new Workflow({
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: MockNodeTypes(),
			id: '2',
		});
		await expect(
			PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, userId),
		).rejects.toThrow(`Target workflow ID ${subworkflow.id} may not be called`);
	});

	test('if sharing is disabled, ensures that workflows are owner by same user', async () => {
		jest
			.spyOn(UserManagementHelper, 'getWorkflowOwner')
			.mockImplementation(async (workflowId) => fakeUser);
		jest.spyOn(UserManagementHelper, 'isSharingEnabled').mockReturnValue(false);
		jest.spyOn(UserService, 'get').mockImplementation(async () => fakeUser);
		jest.spyOn(WorkflowsService, 'getSharing').mockImplementation(async () => {
			return sharedWorkflowNotOwner;
		});

		const subworkflow = new Workflow({
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: MockNodeTypes(),
			id: '2',
		});
		await expect(
			PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, userId),
		).rejects.toThrow(`Target workflow ID ${subworkflow.id} may not be called`);

		// Check description
		try {
			await PermissionChecker.checkSubworkflowExecutePolicy(
				subworkflow,
				subworkflow.settings.userId as string,
				'abcde',
			);
		} catch (error) {
			if (error instanceof SubworkflowOperationError) {
				expect(error.description).toBe(
					`${fakeUser.firstName} (${fakeUser.email}) can make this change. You may need to tell them the ID of this workflow, which is ${subworkflow.id}`,
				);
			}
		}
	});

	test('list of ids must include the parent workflow id', async () => {
		const invalidParentWorkflowId = uuid();
		jest
			.spyOn(UserManagementHelper, 'getWorkflowOwner')
			.mockImplementation(async (workflowId) => fakeUser);
		jest.spyOn(UserManagementHelper, 'isSharingEnabled').mockReturnValue(true);
		jest.spyOn(UserService, 'get').mockImplementation(async () => fakeUser);
		jest.spyOn(WorkflowsService, 'getSharing').mockImplementation(async () => {
			return sharedWorkflowNotOwner;
		});

		const subworkflow = new Workflow({
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: MockNodeTypes(),
			id: '2',
			settings: {
				callerPolicy: 'workflowsFromAList',
				callerIds: '123,456,bcdef  ',
			},
		});
		await expect(
			PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, userId, invalidParentWorkflowId),
		).rejects.toThrow(`Target workflow ID ${subworkflow.id} may not be called`);
	});

	test('sameOwner passes when both workflows are owned by the same user', async () => {
		jest
			.spyOn(UserManagementHelper, 'getWorkflowOwner')
			.mockImplementation(async (workflowId) => fakeUser);
		jest.spyOn(UserManagementHelper, 'isSharingEnabled').mockReturnValue(false);
		jest.spyOn(UserService, 'get').mockImplementation(async () => fakeUser);
		jest.spyOn(WorkflowsService, 'getSharing').mockImplementation(async () => {
			return sharedWorkflowOwner;
		});

		const subworkflow = new Workflow({
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: MockNodeTypes(),
			id: '2',
		});
		await expect(
			PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, userId, userId),
		).resolves.not.toThrow();
	});

	test('workflowsFromAList works when the list contains the parent id', async () => {
		const workflowId = uuid();
		jest
			.spyOn(UserManagementHelper, 'getWorkflowOwner')
			.mockImplementation(async (workflowId) => fakeUser);
		jest.spyOn(UserManagementHelper, 'isSharingEnabled').mockReturnValue(true);
		jest.spyOn(UserService, 'get').mockImplementation(async () => fakeUser);
		jest.spyOn(WorkflowsService, 'getSharing').mockImplementation(async () => {
			return sharedWorkflowNotOwner;
		});

		const subworkflow = new Workflow({
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: MockNodeTypes(),
			id: '2',
			settings: {
				callerPolicy: 'workflowsFromAList',
				callerIds: `123,456,bcdef,  ${workflowId}`,
			},
		});
		await expect(
			PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, userId, workflowId),
		).resolves.not.toThrow();
	});

	test('should not throw when workflow policy is set to any', async () => {
		jest
			.spyOn(UserManagementHelper, 'getWorkflowOwner')
			.mockImplementation(async (workflowId) => fakeUser);
		jest.spyOn(UserManagementHelper, 'isSharingEnabled').mockReturnValue(true);
		jest.spyOn(UserService, 'get').mockImplementation(async () => fakeUser);
		jest.spyOn(WorkflowsService, 'getSharing').mockImplementation(async () => {
			return sharedWorkflowNotOwner;
		});

		const subworkflow = new Workflow({
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: MockNodeTypes(),
			id: '2',
			settings: {
				callerPolicy: 'any',
			},
		});
		await expect(
			PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, userId),
		).resolves.not.toThrow();
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
