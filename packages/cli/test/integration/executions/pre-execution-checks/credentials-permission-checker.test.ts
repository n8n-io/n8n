import {
	createTeamProject,
	getPersonalProject,
	randomCredentialPayload as randomCred,
	testDb,
	mockInstance,
} from '@n8n/backend-test-utils';
import type { Project, User } from '@n8n/db';
import {
	ProjectRepository,
	SharedCredentialsRepository,
	SharedWorkflowRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode, IWorkflowBase } from 'n8n-workflow';
import { randomInt } from 'n8n-workflow';
import { v4 as uuid } from 'uuid';

import { CredentialsPermissionChecker } from '@/executions/pre-execution-checks';
import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { NodeTypes } from '@/node-types';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowValidationService } from '@/workflows/workflow-validation.service';
import { affixRoleToSaveCredential } from '@test-integration/db/credentials';
import { createOwner, createUser } from '@test-integration/db/users';
import type { SaveCredentialFunction } from '@test-integration/types';
import { mockNodeTypesData } from '@test-integration/utils/node-types-data';

const ownershipService = mockInstance(OwnershipService);

const createWorkflow = async (nodes: INode[], workflowOwner?: User): Promise<IWorkflowBase> => {
	const workflowDetails = {
		id: randomInt(1, 10).toString(),
		name: 'test',
		active: false,
		connections: {},
		nodeTypes: mockNodeTypes,
		nodes,
		versionId: uuid(),
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

let permissionChecker: CredentialsPermissionChecker;

beforeAll(async () => {
	await testDb.init();

	saveCredential = affixRoleToSaveCredential('credential:owner');

	permissionChecker = Container.get(CredentialsPermissionChecker);

	[owner, member] = await Promise.all([createOwner(), createUser()]);
	ownerPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		owner.id,
	);
	memberPersonalProject = await Container.get(ProjectRepository).getPersonalProjectForUserOrFail(
		member.id,
	);
});

// The publish check a published workflow runs through: what the publisher may
// use in this workflow, end to end against the database.
describe('publish check for the Owner in a team project', () => {
	const credentialNode = (credential: { id: string; name: string }): INode => ({
		id: uuid(),
		name: 'Action Network',
		type: 'n8n-nodes-base.actionNetwork',
		parameters: {},
		typeVersion: 1,
		position: [0, 0],
		credentials: { actionNetworkApi: { id: credential.id, name: credential.name } },
	});

	/** A team-project workflow that uses a member's personal credential. */
	const setUp = async () => {
		const teamProject = await createTeamProject('Marketing', member);
		const credential = await saveCredential(randomCred(), { user: member });
		const nodes = [credentialNode(credential)];
		const workflow = await Container.get(WorkflowRepository).save({
			id: randomInt(100, 100_000).toString(),
			name: 'test',
			active: false,
			connections: {},
			nodes,
			versionId: uuid(),
		});
		await Container.get(SharedWorkflowRepository).save({
			workflow,
			project: teamProject,
			role: 'workflow:owner',
		});
		ownershipService.getWorkflowProjectCached.mockResolvedValue(teamProject);

		const publish = async () =>
			await Container.get(WorkflowValidationService).validatePublisherCredentialAccess(
				owner,
				nodes,
				workflow.id,
			);
		return { teamProject, credential, publish };
	};

	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'CredentialsEntity']);
		process.env.N8N_ENV_FEAT_CRED_SHARING = 'true';
	});

	afterEach(() => {
		delete process.env.N8N_ENV_FEAT_CRED_SHARING;
		ownershipService.getWorkflowProjectCached.mockReset();
	});

	test('refuses a personal credential that nobody shared with the project', async () => {
		const { credential, publish } = await setUp();

		await expect(publish()).resolves.toEqual({
			isValid: false,
			error: `Cannot publish workflow: You do not have access to credential "${credential.name}". Ask its owner to share it with you.`,
		});
	});

	test('accepts the credential once it is shared with the project', async () => {
		const { teamProject, credential, publish } = await setUp();
		await Container.get(SharedCredentialsRepository).save(
			Container.get(SharedCredentialsRepository).create({
				projectId: teamProject.id,
				credentialsId: credential.id,
				role: 'credential:user',
			}),
		);

		await expect(publish()).resolves.toEqual({ isValid: true });
	});

	test('does not check credentials with the flag off', async () => {
		const { publish } = await setUp();
		delete process.env.N8N_ENV_FEAT_CRED_SHARING;

		await expect(publish()).resolves.toEqual({ isValid: true });
	});
});

describe('check()', () => {
	beforeEach(async () => {
		await testDb.truncate(['WorkflowEntity', 'CredentialsEntity']);
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	test('should allow if workflow has no creds', async () => {
		const nodes: INode[] = [
			{
				id: uuid(),
				name: 'Start',
				type: 'n8n-nodes-base.manualTrigger',
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
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(owner);

		await expect(
			permissionChecker.check(workflowEntity.id, workflowEntity.nodes),
		).resolves.not.toThrow();
	});
});
