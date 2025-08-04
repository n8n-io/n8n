'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
const uuid_1 = require('uuid');
const pre_execution_checks_1 = require('@/executions/pre-execution-checks');
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const node_types_1 = require('@/node-types');
const ownership_service_1 = require('@/services/ownership.service');
const credentials_1 = require('@test-integration/db/credentials');
const users_1 = require('@test-integration/db/users');
const node_types_data_1 = require('@test-integration/utils/node-types-data');
const ownershipService = (0, backend_test_utils_1.mockInstance)(
	ownership_service_1.OwnershipService,
);
const createWorkflow = async (nodes, workflowOwner) => {
	const workflowDetails = {
		id: (0, n8n_workflow_1.randomInt)(1, 10).toString(),
		name: 'test',
		active: false,
		connections: {},
		nodeTypes: mockNodeTypes,
		nodes,
	};
	const workflowEntity = await di_1.Container.get(db_1.WorkflowRepository).save(workflowDetails);
	if (workflowOwner) {
		const project = await (0, backend_test_utils_1.getPersonalProject)(workflowOwner);
		await di_1.Container.get(db_1.SharedWorkflowRepository).save({
			workflow: workflowEntity,
			user: workflowOwner,
			project,
			role: 'workflow:owner',
		});
	}
	return workflowEntity;
};
let saveCredential;
let owner;
let member;
let ownerPersonalProject;
let memberPersonalProject;
const mockNodeTypes = (0, backend_test_utils_1.mockInstance)(node_types_1.NodeTypes);
(0, backend_test_utils_1.mockInstance)(load_nodes_and_credentials_1.LoadNodesAndCredentials, {
	loadedNodes: (0, node_types_data_1.mockNodeTypesData)(['start', 'actionNetwork']),
});
let permissionChecker;
beforeAll(async () => {
	await backend_test_utils_1.testDb.init();
	saveCredential = (0, credentials_1.affixRoleToSaveCredential)('credential:owner');
	permissionChecker = di_1.Container.get(pre_execution_checks_1.CredentialsPermissionChecker);
	[owner, member] = await Promise.all([(0, users_1.createOwner)(), (0, users_1.createUser)()]);
	ownerPersonalProject = await di_1.Container.get(
		db_1.ProjectRepository,
	).getPersonalProjectForUserOrFail(owner.id);
	memberPersonalProject = await di_1.Container.get(
		db_1.ProjectRepository,
	).getPersonalProjectForUserOrFail(member.id);
});
describe('check()', () => {
	beforeEach(async () => {
		await backend_test_utils_1.testDb.truncate(['WorkflowEntity', 'CredentialsEntity']);
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	test('should allow if workflow has no creds', async () => {
		const nodes = [
			{
				id: (0, uuid_1.v4)(),
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
		const ownerCred = await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
			user: owner,
		});
		const memberCred = await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
			user: member,
		});
		await di_1.Container.get(db_1.SharedCredentialsRepository).save(
			di_1.Container.get(db_1.SharedCredentialsRepository).create({
				projectId: (await (0, backend_test_utils_1.getPersonalProject)(member)).id,
				credentialsId: ownerCred.id,
				role: 'credential:user',
			}),
		);
		const nodes = [
			{
				id: (0, uuid_1.v4)(),
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
				id: (0, uuid_1.v4)(),
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
		const memberCred = await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
			user: member,
		});
		const ownerCred = await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
			user: owner,
		});
		const nodes = [
			{
				id: (0, uuid_1.v4)(),
				name: 'Action Network',
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
			{
				id: (0, uuid_1.v4)(),
				name: 'Action Network 2',
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
		];
		const workflowEntity = await createWorkflow(nodes, member);
		await expect(
			permissionChecker.check(workflowEntity.id, workflowEntity.nodes),
		).rejects.toThrow();
	});
	test('should allow all credentials if current user is instance owner', async () => {
		const memberCred = await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
			user: member,
		});
		const ownerCred = await saveCredential((0, backend_test_utils_1.randomCredentialPayload)(), {
			user: owner,
		});
		const nodes = [
			{
				id: (0, uuid_1.v4)(),
				name: 'Action Network',
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
			{
				id: (0, uuid_1.v4)(),
				name: 'Action Network 2',
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
		];
		const workflowEntity = await createWorkflow(nodes, owner);
		ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(ownerPersonalProject);
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(owner);
		await expect(
			permissionChecker.check(workflowEntity.id, workflowEntity.nodes),
		).resolves.not.toThrow();
	});
});
//# sourceMappingURL=credentials-permission-checker.test.js.map
