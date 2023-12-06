import { v4 as uuid } from 'uuid';
import { Container } from 'typedi';
import type { INodeTypes, WorkflowSettings } from 'n8n-workflow';
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
	randomName,
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
import { UserRepository } from '@/databases/repositories/user.repository';
import { LicenseMocker } from '../integration/shared/license';
import { License } from '@/License';
import { generateNanoId } from '@/databases/utils/generators';
import type { WorkflowEntity } from '@/databases/entities/WorkflowEntity';

function createSubworkflow({ policy }: { policy: WorkflowSettings.CallerPolicy }) {
	return new Workflow({
		id: uuid(),
		nodes: [],
		connections: {},
		active: false,
		nodeTypes: mockNodeTypes,
		settings: {
			callerPolicy: policy,
		},
	});
}

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

	let parentWorkflow: WorkflowEntity;

	beforeAll(() => {
		parentWorkflow = Container.get(WorkflowRepository).create({
			id: generateNanoId(),
			name: randomName(),
			active: false,
			connections: {},
			nodes: [
				{
					name: '',
					typeVersion: 1,
					type: 'n8n-nodes-base.executeWorkflow',
					position: [0, 0],
					parameters: {},
				},
			],
		});
	});

	test('sets default policy from environment when subworkflow has none', async () => {
		await Container.get(WorkflowRepository).save(parentWorkflow);

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
			PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id),
		).rejects.toThrow(`Target workflow ID ${subworkflow.id} may not be called`);
	});

	test('if sharing is disabled, ensures that workflows are owned by same user and reject running workflows belonging to another user even if setting allows execution', async () => {
		await Container.get(WorkflowRepository).save(parentWorkflow);

		jest.spyOn(ownershipService, 'getWorkflowOwnerCached').mockResolvedValueOnce(fakeUser);
		jest.spyOn(ownershipService, 'getWorkflowOwnerCached').mockResolvedValueOnce(nonOwnerUser);
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
			PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id),
		).rejects.toThrow(`Target workflow ID ${subworkflow.id} may not be called`);

		// Check description
		try {
			await PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, 'abcde');
		} catch (error) {
			if (error instanceof SubworkflowOperationError) {
				expect(error.description).toBe(
					`${fakeUser.firstName} (${fakeUser.email}) can make this change. You may need to tell them the ID of this workflow, which is ${subworkflow.id}`,
				);
			}
		}
	});

	test('should throw if allowed list does not contain parent workflow id', async () => {
		await Container.get(WorkflowRepository).save(parentWorkflow);

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
			PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id),
		).rejects.toThrow(`Target workflow ID ${subworkflow.id} may not be called`);
	});

	test('sameOwner passes when both workflows are owned by the same user', async () => {
		await Container.get(WorkflowRepository).save(parentWorkflow);

		jest.spyOn(ownershipService, 'getWorkflowOwnerCached').mockImplementation(async () => fakeUser);
		jest.spyOn(UserManagementHelper, 'isSharingEnabled').mockReturnValue(false);

		const subworkflow = new Workflow({
			nodes: [],
			connections: {},
			active: false,
			nodeTypes: mockNodeTypes,
			id: '2',
		});
		await expect(
			PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id),
		).resolves.not.toThrow();
	});

	test('workflowsFromAList works when the list contains the parent id', async () => {
		await Container.get(WorkflowRepository).save(parentWorkflow);

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
				callerIds: `123,456,bcdef,  ${parentWorkflow.id}`,
			},
		});
		await expect(
			PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id),
		).resolves.not.toThrow();
	});

	test('should not throw when workflow policy is set to any', async () => {
		await Container.get(WorkflowRepository).save(parentWorkflow);

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
			PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id),
		).resolves.not.toThrow();
	});

	describe('with workflows-from-same-owner caller policy', () => {
		beforeAll(() => {
			const license = new LicenseMocker();
			license.mock(Container.get(License));
			license.enable('feat:sharing');
		});

		test('should deny if the two workflows are owned by different users', async () => {
			const parentWorkflowOwner = Container.get(UserRepository).create({ id: uuid() });
			const subworkflowOwner = Container.get(UserRepository).create({ id: uuid() });

			ownershipService.getWorkflowOwnerCached.mockResolvedValueOnce(parentWorkflowOwner);
			ownershipService.getWorkflowOwnerCached.mockResolvedValueOnce(subworkflowOwner);

			const subworkflow = createSubworkflow({ policy: 'workflowsFromSameOwner' });

			const check = PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, uuid());

			await expect(check).rejects.toThrow();
		});

		test('should allow if both workflows are owned by the same user', async () => {
			await Container.get(WorkflowRepository).save(parentWorkflow);

			const bothWorkflowsOwner = Container.get(UserRepository).create({ id: uuid() });

			ownershipService.getWorkflowOwnerCached.mockResolvedValueOnce(bothWorkflowsOwner); // parent workflow
			ownershipService.getWorkflowOwnerCached.mockResolvedValueOnce(bothWorkflowsOwner); // subworkflow

			const subworkflow = createSubworkflow({ policy: 'workflowsFromSameOwner' });

			const check = PermissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id);

			await expect(check).resolves.not.toThrow();
		});
	});
});
