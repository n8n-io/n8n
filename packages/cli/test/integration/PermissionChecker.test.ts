import { v4 as uuid } from 'uuid';
import { Container } from 'typedi';
import type { INode, WorkflowSettings } from 'n8n-workflow';
import { SubworkflowOperationError, Workflow } from 'n8n-workflow';

import config from '@/config';
import type { User } from '@db/entities/User';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
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
import { SharedCredentialsRepository } from '@/databases/repositories/sharedCredentials.repository';
import { getPersonalProject } from './shared/db/projects';
import type { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import { Project } from '@/databases/entities/Project';
import { ProjectRepository } from '@/databases/repositories/project.repository';

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

const ownershipService = mockInstance(OwnershipService);

const createWorkflow = async (nodes: INode[], workflowOwner?: User): Promise<WorkflowEntity> => {
	const workflowDetails = {
		id: randomPositiveDigit().toString(),
		name: 'test',
		active: false,
		connections: {},
		nodeTypes: mockNodeTypes,
		nodes,
	};

	const workflowEntity = await Container.get(WorkflowRepository).save(workflowDetails);
	if (workflowOwner) {
		const project = await getPersonalProject(workflowOwner);

		await Container.get(SharedWorkflowRepository).save({
			workflow: workflowEntity,
			user: workflowOwner,
			project,
			role: 'workflow:owner',
		});
	}

	return workflowEntity;
};

let saveCredential: SaveCredentialFunction;

let owner: User;
let member: User;
let ownerPersonalProject: Project;
let memberPersonalProject: Project;

const mockNodeTypes = mockInstance(NodeTypes);
mockInstance(LoadNodesAndCredentials, {
	loadedNodes: mockNodeTypesData(['start', 'actionNetwork']),
});

let permissionChecker: PermissionChecker;

beforeAll(async () => {
	await testDb.init();

	saveCredential = affixRoleToSaveCredential('credential:owner');

	permissionChecker = Container.get(PermissionChecker);

	[owner, member] = await Promise.all([createOwner(), createUser()]);
	ownerPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		owner.id,
	);
	memberPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		member.id,
	);
});

describe('check()', () => {
	beforeEach(async () => {
		await testDb.truncate(['Workflow', 'Credentials']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	test('should allow if workflow has no creds', async () => {
		const nodes: INode[] = [
			{
				id: uuid(),
				name: 'Start',
				type: 'n8n-nodes-base.start',
				typeVersion: 1,
				parameters: {},
				position: [0, 0],
			},
		];

		const workflow = await createWorkflow(nodes, member);
		ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(memberPersonalProject);

		await expect(permissionChecker.check(workflow.id, nodes)).resolves.not.toThrow();
	});

	test('should allow if workflow creds are valid subset', async () => {
		const ownerCred = await saveCredential(randomCred(), { user: owner });
		const memberCred = await saveCredential(randomCred(), { user: member });

		await Container.get(SharedCredentialsRepository).save(
			Container.get(SharedCredentialsRepository).create({
				projectId: (await getPersonalProject(member)).id,
				credentialsId: ownerCred.id,
				role: 'credential:user',
			}),
		);

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
		];

		const workflowEntity = await createWorkflow(nodes, member);

		ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(memberPersonalProject);

		await expect(permissionChecker.check(workflowEntity.id, nodes)).resolves.not.toThrow();
	});

	test('should deny if workflow creds are not valid subset', async () => {
		const memberCred = await saveCredential(randomCred(), { user: member });
		const ownerCred = await saveCredential(randomCred(), { user: owner });

		const nodes = [
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
						id: ownerCred.id,
						name: ownerCred.name,
					},
				},
			},
		];

		const workflowEntity = await createWorkflow(nodes, member);

		await expect(
			permissionChecker.check(workflowEntity.id, workflowEntity.nodes),
		).rejects.toThrow();
	});

	test('should allow all credentials if current user is instance owner', async () => {
		const memberCred = await saveCredential(randomCred(), { user: member });
		const ownerCred = await saveCredential(randomCred(), { user: owner });

		const nodes = [
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
						id: ownerCred.id,
						name: ownerCred.name,
					},
				},
			},
		];

		const workflowEntity = await createWorkflow(nodes, owner);
		ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(ownerPersonalProject);
		ownershipService.getProjectOwnerCached.mockResolvedValueOnce(owner);

		await expect(
			permissionChecker.check(workflowEntity.id, workflowEntity.nodes),
		).resolves.not.toThrow();
	});
});

describe('checkSubworkflowExecutePolicy()', () => {
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

			ownershipService.getWorkflowProjectCached.mockResolvedValue(memberPersonalProject);

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

			const firstProject = Container.get(ProjectRepository).create({ id: uuid() });
			const secondProject = Container.get(ProjectRepository).create({ id: uuid() });

			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(firstProject); // parent workflow
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(secondProject); // subworkflow

			const check = permissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id);

			await expect(check).rejects.toThrow(toTargetCallErrorMsg(subworkflow.id));

			try {
				await permissionChecker.checkSubworkflowExecutePolicy(subworkflow, uuid());
			} catch (error) {
				if (error instanceof SubworkflowOperationError) {
					expect(error.description).toBe(
						`An admin for the ${firstProject.name} project can make this change. You may need to tell them the ID of the sub-workflow, which is ${subworkflow.id}`,
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
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(new Project());

			const check = permissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id);

			await expect(check).resolves.not.toThrow();
		});
	});

	describe('workflows-from-same-owner caller policy', () => {
		test('should deny if the two workflows are owned by different users', async () => {
			const parentWorkflowProject = Container.get(ProjectRepository).create({ id: uuid() });
			const subworkflowOwner = Container.get(ProjectRepository).create({ id: uuid() });

			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(parentWorkflowProject); // parent workflow
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(subworkflowOwner); // subworkflow

			const subworkflow = createSubworkflow({ policy: 'workflowsFromSameOwner' });

			const check = permissionChecker.checkSubworkflowExecutePolicy(subworkflow, uuid());

			await expect(check).rejects.toThrow(toTargetCallErrorMsg(subworkflow.id));
		});

		test('should allow if both workflows are owned by the same user', async () => {
			const parentWorkflow = createParentWorkflow();

			const bothWorkflowsProject = Container.get(ProjectRepository).create({ id: uuid() });

			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(bothWorkflowsProject); // parent workflow
			ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(bothWorkflowsProject); // subworkflow

			const subworkflow = createSubworkflow({ policy: 'workflowsFromSameOwner' });

			const check = permissionChecker.checkSubworkflowExecutePolicy(subworkflow, parentWorkflow.id);

			await expect(check).resolves.not.toThrow();
		});
	});
});
