import { v4 as uuid } from 'uuid';
import { Container } from 'typedi';
import type { WorkflowSettings } from 'n8n-workflow';
import { SubworkflowOperationError, Workflow } from 'n8n-workflow';

import config from '@/config';
import { User } from '@db/entities/User';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { UserRepository } from '@/databases/repositories/user.repository';
import { generateNanoId } from '@/databases/utils/generators';
import { License } from '@/License';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { NodeTypes } from '@/NodeTypes';
import { OwnershipService } from '@/services/ownership.service';
import { PermissionChecker } from '@/UserManagement/PermissionChecker';

import { mockInstance } from '../shared/mocking';
import {
	randomCredentialPayload as randomCred,
	randomName,
	randomPositiveDigit,
} from '../integration/shared/random';
import { LicenseMocker } from '../integration/shared/license';
import * as testDb from '../integration/shared/testDb';
import type { SaveCredentialFunction } from '../integration/shared/types';
import { mockNodeTypesData } from '../unit/Helpers';
import { affixRoleToSaveCredential } from '../integration/shared/db/credentials';
import { createOwner, createUser } from '../integration/shared/db/users';

export const toTargetCallErrorMsg = (subworkflowId: string) =>
	`Target workflow ID ${subworkflowId} may not be called`;

export function createParentWorkflow() {
	return Container.get(WorkflowRepository).create({
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
}

export function createSubworkflow({
	policy,
	callerIds,
}: {
	policy?: WorkflowSettings.CallerPolicy;
	callerIds?: string;
} = {}) {
	return new Workflow({
		id: uuid(),
		nodes: [],
		connections: {},
		active: false,
		nodeTypes: mockNodeTypes,
		settings: {
			...(policy ? { callerPolicy: policy } : {}),
			...(callerIds ? { callerIds } : {}),
		},
	});
}

let saveCredential: SaveCredentialFunction;

const mockNodeTypes = mockInstance(NodeTypes);
mockInstance(LoadNodesAndCredentials, {
	loadedNodes: mockNodeTypesData(['start', 'actionNetwork']),
});

let permissionChecker: PermissionChecker;

beforeAll(async () => {
	await testDb.init();

	saveCredential = affixRoleToSaveCredential('credential:owner');

	permissionChecker = Container.get(PermissionChecker);
});

describe('check()', () => {
	beforeEach(async () => {
		await testDb.truncate(['Workflow', 'Credentials']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

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

		expect(async () => await permissionChecker.check(workflow, userId)).not.toThrow();
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

		expect(async () => await permissionChecker.check(workflow, owner.id)).not.toThrow();
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

		expect(async () => await permissionChecker.check(workflow, owner.id)).not.toThrow();
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
			role: 'workflow:owner',
		});

		const workflow = new Workflow(workflowDetails);

		await expect(permissionChecker.check(workflow, member.id)).rejects.toThrow();
	});
});

describe('checkSubworkflowExecutePolicy()', () => {
	const ownershipService = mockInstance(OwnershipService);

	let license: LicenseMocker;

	beforeAll(() => {
		license = new LicenseMocker();
		license.mock(Container.get(License));
		license.enable('feat:sharing');
	});

	describe('no caller policy', () => {
		test('should fall back to N8N_WORKFLOW_CALLER_POLICY_DEFAULT_OPTION', async () => {
			config.set('workflows.callerPolicyDefaultOption', 'none');

			const parentWorkflow = createParentWorkflow();
			const subworkflow = createSubworkflow(); // no caller policy

			ownershipService.getWorkflowOwnerCached.mockResolvedValue(new User());

			const check = permissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id);

			await expect(check).rejects.toThrow(toTargetCallErrorMsg(subworkflow.id));

			config.load(config.default);
		});
	});

	describe('overridden caller policy', () => {
		test('if no sharing, should override policy to workflows-from-same-owner', async () => {
			license.disable('feat:sharing');

			const parentWorkflow = createParentWorkflow();
			const subworkflow = createSubworkflow({ policy: 'any' }); // should be overridden

			const firstUser = Container.get(UserRepository).create({ id: uuid() });
			const secondUser = Container.get(UserRepository).create({ id: uuid() });

			ownershipService.getWorkflowOwnerCached.mockResolvedValueOnce(firstUser); // parent workflow
			ownershipService.getWorkflowOwnerCached.mockResolvedValueOnce(secondUser); // subworkflow

			const check = permissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id);

			await expect(check).rejects.toThrow(toTargetCallErrorMsg(subworkflow.id));

			try {
				await permissionChecker.checkSubworkflowExecutePolicy(subworkflow, uuid());
			} catch (error) {
				if (error instanceof SubworkflowOperationError) {
					expect(error.description).toBe(
						`${firstUser.firstName} (${firstUser.email}) can make this change. You may need to tell them the ID of this workflow, which is ${subworkflow.id}`,
					);
				}
			}

			license.enable('feat:sharing');
		});
	});

	describe('workflows-from-list caller policy', () => {
		test('should allow if caller list contains parent workflow ID', async () => {
			const parentWorkflow = createParentWorkflow();

			const subworkflow = createSubworkflow({
				policy: 'workflowsFromAList',
				callerIds: `123,456,bcdef,  ${parentWorkflow.id}`,
			});

			const check = permissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id);

			await expect(check).resolves.not.toThrow();
		});

		test('should deny if caller list does not contain parent workflow ID', async () => {
			const parentWorkflow = createParentWorkflow();

			const subworkflow = createSubworkflow({
				policy: 'workflowsFromAList',
				callerIds: 'xyz',
			});

			const check = permissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id);

			await expect(check).rejects.toThrow();
		});
	});

	describe('any caller policy', () => {
		test('should not throw', async () => {
			const parentWorkflow = createParentWorkflow();
			const subworkflow = createSubworkflow({ policy: 'any' });
			ownershipService.getWorkflowOwnerCached.mockResolvedValue(new User());

			const check = permissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id);

			await expect(check).resolves.not.toThrow();
		});
	});

	describe('workflows-from-same-owner caller policy', () => {
		test('should deny if the two workflows are owned by different users', async () => {
			const parentWorkflowOwner = Container.get(UserRepository).create({ id: uuid() });
			const subworkflowOwner = Container.get(UserRepository).create({ id: uuid() });

			ownershipService.getWorkflowOwnerCached.mockResolvedValueOnce(parentWorkflowOwner); // parent workflow
			ownershipService.getWorkflowOwnerCached.mockResolvedValueOnce(subworkflowOwner); // subworkflow

			const subworkflow = createSubworkflow({ policy: 'workflowsFromSameOwner' });

			const check = permissionChecker.checkSubworkflowExecutePolicy(subworkflow, uuid());

			await expect(check).rejects.toThrow(toTargetCallErrorMsg(subworkflow.id));
		});

		test('should allow if both workflows are owned by the same user', async () => {
			const parentWorkflow = createParentWorkflow();

			const bothWorkflowsOwner = Container.get(UserRepository).create({ id: uuid() });

			ownershipService.getWorkflowOwnerCached.mockResolvedValueOnce(bothWorkflowsOwner); // parent workflow
			ownershipService.getWorkflowOwnerCached.mockResolvedValueOnce(bothWorkflowsOwner); // subworkflow

			const subworkflow = createSubworkflow({ policy: 'workflowsFromSameOwner' });

			const check = permissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id);

			await expect(check).resolves.not.toThrow();
		});
	});
});
