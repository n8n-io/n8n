import { v4 as uuid } from 'uuid';
import { Container } from 'typedi';
import type { INode } from 'n8n-workflow';
import { randomInt } from 'n8n-workflow';
import type { User } from '@db/entities/User';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { NodeTypes } from '@/NodeTypes';
import { OwnershipService } from '@/services/ownership.service';
import { PermissionChecker } from '@/UserManagement/PermissionChecker';

import { mockInstance } from '../shared/mocking';
import { randomCredentialPayload as randomCred } from '../integration/shared/random';
import * as testDb from '../integration/shared/testDb';
import type { SaveCredentialFunction } from '../integration/shared/types';
import { mockNodeTypesData } from '../unit/Helpers';
import { affixRoleToSaveCredential } from '../integration/shared/db/credentials';
import { createOwner, createUser } from '../integration/shared/db/users';
import { SharedCredentialsRepository } from '@/databases/repositories/sharedCredentials.repository';
import { getPersonalProject } from './shared/db/projects';
import type { WorkflowEntity } from '@/databases/entities/WorkflowEntity';
import type { Project } from '@/databases/entities/Project';
import { ProjectRepository } from '@/databases/repositories/project.repository';

const ownershipService = mockInstance(OwnershipService);

const createWorkflow = async (nodes: INode[], workflowOwner?: User): Promise<WorkflowEntity> => {
	const workflowDetails = {
		id: randomInt(1, 10).toString(),
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
