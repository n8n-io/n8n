import { v4 as uuid } from 'uuid';
import { Container } from 'typedi';
import type { INodeTypes } from 'n8n-workflow';
import { SubworkflowOperationError, Workflow } from 'n8n-workflow';

import config from '@/config';
import { Role } from '@db/entities/Role';
import { User } from '@db/entities/User';
import { SharedWorkflow } from '@db/entities/SharedWorkflow';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { NodeTypes } from '@/NodeTypes';
import { PermissionChecker } from '@/UserManagement/PermissionChecker';
import * as UserManagementHelper from '@/UserManagement/UserManagementHelper';
import { OwnershipService } from '@/services/ownership.service';

import { mockInstance } from '../shared/mocking';
import {
	randomCredentialPayload as randomCred,
	randomPositiveDigit,
} from '../integration/shared/random';
import * as testDb from '../integration/shared/testDb';
import type { SaveCredentialFunction } from '../integration/shared/types';
import { mockNodeTypesData } from './Helpers';
import { affixRoleToSaveCredential } from '../integration/shared/db/credentials';
import { getCredentialOwnerRole, getWorkflowOwnerRole } from '../integration/shared/db/roles';
import { createOwner, createUser } from '../integration/shared/db/users';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { generateNanoId } from '@/databases/utils/generators';

let mockNodeTypes: INodeTypes;
let credentialOwnerRole: Role;
let workflowOwnerRole: Role;
let saveCredential: SaveCredentialFunction;

mockInstance(LoadNodesAndCredentials, {
	loadedNodes: mockNodeTypesData(['start', 'actionNetwork']),
});

beforeAll(async () => {
	await testDb.init();

	mockNodeTypes = Container.get(NodeTypes);

	credentialOwnerRole = await getCredentialOwnerRole();
	workflowOwnerRole = await getWorkflowOwnerRole();

	saveCredential = affixRoleToSaveCredential(credentialOwnerRole);
});

beforeEach(async () => {
	await testDb.truncate(['SharedWorkflow', 'SharedCredentials', 'Workflow', 'Credentials', 'User']);
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

		expect(async () => PermissionChecker.check(workflow, userId)).not.toThrow();
	});

	test('should allow if requesting user is instance owner', async () => {
		const owner = await createOwner();

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

		expect(async () => PermissionChecker.check(workflow, owner.id)).not.toThrow();
	});

	test('should allow if workflow creds are valid subset', async () => {
		const [owner, member] = await Promise.all([createOwner(), createUser()]);

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

		expect(async () => PermissionChecker.check(workflow, owner.id)).not.toThrow();
	});

	test('should deny if workflow creds are not valid subset', async () => {
		const member = await createUser();

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

		const workflowEntity = await Container.get(WorkflowRepository).save(workflowDetails);

		await Container.get(SharedWorkflowRepository).save({
			workflow: workflowEntity,
			user: member,
			role: workflowOwnerRole,
		});

		const workflow = new Workflow(workflowDetails);

		await expect(PermissionChecker.check(workflow, member.id)).rejects.toThrow();
	});
});

describe('PermissionChecker.checkSubworkflowExecutePolicy', () => {
	const userId = uuid();
	const fakeUser = new User();
	fakeUser.id = userId;
	const ownershipService = mockInstance(OwnershipService);

	const ownerMockRole = new Role();
	ownerMockRole.name = 'owner';
	const sharedWorkflowOwner = new SharedWorkflow();
	sharedWorkflowOwner.role = ownerMockRole;

	const nonOwnerMockRole = new Role();
	nonOwnerMockRole.name = 'editor';
	const nonOwnerUser = new User();
	nonOwnerUser.id = uuid();

	test('sets default policy from environment when subworkflow has none', async () => {
		config.set('workflows.callerPolicyDefaultOption', 'none');
		jest.spyOn(ownershipService, 'getWorkflowOwnerCached').mockResolvedValue(fakeUser);
		jest.spyOn(UserManagementHelper, 'isSharingEnabled').mockReturnValue(true);

		const subworkflow = new Workflow({
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: mockNodeTypes,
			id: '2',
		});
		await expect(
			PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, userId),
		).rejects.toThrow(`Target workflow ID ${subworkflow.id} may not be called`);
	});

	test('if sharing is disabled, ensures that workflows are owned by same user and reject running workflows belonging to another user even if setting allows execution', async () => {
		jest.spyOn(ownershipService, 'getWorkflowOwnerCached').mockResolvedValue(nonOwnerUser);
		jest.spyOn(UserManagementHelper, 'isSharingEnabled').mockReturnValue(false);

		const subworkflow = new Workflow({
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: mockNodeTypes,
			id: '2',
			settings: {
				callerPolicy: 'any',
			},
		});
		await expect(
			PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, userId),
		).rejects.toThrow(`Target workflow ID ${subworkflow.id} may not be called`);

		// Check description
		try {
			await PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, '', 'abcde');
		} catch (error) {
			if (error instanceof SubworkflowOperationError) {
				expect(error.description).toBe(
					'In the community version, a subworkflow can only be called by a workflow created by the same owner as the subworkflow.',
				);
			}
		}
	});

	test('should throw if allowed list does not contain parent workflow id', async () => {
		const invalidParentWorkflowId = uuid();
		jest
			.spyOn(ownershipService, 'getWorkflowOwnerCached')
			.mockImplementation(async (workflowId) => fakeUser);
		jest.spyOn(UserManagementHelper, 'isSharingEnabled').mockReturnValue(true);

		const subworkflow = new Workflow({
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: mockNodeTypes,
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

	describe('with `workflowsFromSameOwner` policy in community edition', () => {
		const workflowArgs = {
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: mockNodeTypes,
			id: generateNanoId(),
		};

		it('should pass if workflow is owned by the same user', async () => {
			jest.spyOn(UserManagementHelper, 'isSharingEnabled').mockReturnValue(false);

			ownershipService.getWorkflowOwnerCached.mockResolvedValue(fakeUser);

			const subworkflow = new Workflow(workflowArgs);

			const check = PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, fakeUser.id);

			await expect(check).resolves.not.toThrow();
		});

		it('should throw if workflow is not owned by the same user', async () => {
			jest.spyOn(UserManagementHelper, 'isSharingEnabled').mockReturnValue(false);

			ownershipService.getWorkflowOwnerCached.mockResolvedValue(fakeUser);

			const subworkflow = new Workflow(workflowArgs);

			const check = PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, nonOwnerUser.id);

			await expect(check).rejects.toThrow(`Target workflow ID ${subworkflow.id} may not be called`);
		});
	});

	test('workflowsFromAList works when the list contains the parent id', async () => {
		const workflowId = uuid();
		jest
			.spyOn(ownershipService, 'getWorkflowOwnerCached')
			.mockImplementation(async (workflowId) => fakeUser);
		jest.spyOn(UserManagementHelper, 'isSharingEnabled').mockReturnValue(true);

		const subworkflow = new Workflow({
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: mockNodeTypes,
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
			.spyOn(ownershipService, 'getWorkflowOwnerCached')
			.mockImplementation(async (workflowId) => fakeUser);
		jest.spyOn(UserManagementHelper, 'isSharingEnabled').mockReturnValue(true);

		const subworkflow = new Workflow({
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: mockNodeTypes,
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
