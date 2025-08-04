'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const telemetry_1 = require('@/telemetry');
const workflow_service_ee_1 = require('@/workflows/workflow.service.ee');
const workflow_1 = require('../shared/workflow');
describe('EnterpriseWorkflowService', () => {
	let service;
	beforeAll(async () => {
		await backend_test_utils_1.testDb.init();
		(0, backend_test_utils_1.mockInstance)(telemetry_1.Telemetry);
		service = new workflow_service_ee_1.EnterpriseWorkflowService(
			(0, jest_mock_extended_1.mock)(),
			di_1.Container.get(db_1.SharedWorkflowRepository),
			di_1.Container.get(db_1.WorkflowRepository),
			di_1.Container.get(db_1.CredentialsRepository),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
			(0, jest_mock_extended_1.mock)(),
		);
	});
	afterEach(async () => {
		await backend_test_utils_1.testDb.truncate(['WorkflowEntity']);
		jest.restoreAllMocks();
	});
	afterAll(async () => {
		await backend_test_utils_1.testDb.terminate();
	});
	describe('validateWorkflowCredentialUsage', () => {
		function generateCredentialEntity(credentialId) {
			const credentialEntity = new db_1.CredentialsEntity();
			credentialEntity.id = credentialId;
			return credentialEntity;
		}
		it('Should throw error saving a workflow using credential without access', () => {
			const newWorkflowVersion = (0, workflow_1.getWorkflow)({ addNodeWithOneCred: true });
			const previousWorkflowVersion = (0, workflow_1.getWorkflow)();
			expect(() => {
				service.validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, []);
			}).toThrow();
		});
		it('Should not throw error when saving a workflow using credential with access', () => {
			const newWorkflowVersion = (0, workflow_1.getWorkflow)({ addNodeWithOneCred: true });
			const previousWorkflowVersion = (0, workflow_1.getWorkflow)();
			expect(() => {
				service.validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, [
					generateCredentialEntity('1'),
				]);
			}).not.toThrow();
		});
		it('Should not throw error when saving a workflow removing node without credential access', () => {
			const newWorkflowVersion = (0, workflow_1.getWorkflow)();
			const previousWorkflowVersion = (0, workflow_1.getWorkflow)({ addNodeWithOneCred: true });
			expect(() => {
				service.validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, [
					generateCredentialEntity('1'),
				]);
			}).not.toThrow();
		});
		it('Should save fine when not making changes to workflow without access', () => {
			const workflowWithOneCredential = (0, workflow_1.getWorkflow)({ addNodeWithOneCred: true });
			expect(() => {
				service.validateWorkflowCredentialUsage(
					workflowWithOneCredential,
					workflowWithOneCredential,
					[],
				);
			}).not.toThrow();
		});
		it('Should throw error saving a workflow adding node without credential access', () => {
			const newWorkflowVersion = (0, workflow_1.getWorkflow)({
				addNodeWithOneCred: true,
				addNodeWithTwoCreds: true,
			});
			const previousWorkflowVersion = (0, workflow_1.getWorkflow)({ addNodeWithOneCred: true });
			expect(() => {
				service.validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, []);
			}).toThrow();
		});
	});
	describe('getNodesWithInaccessibleCreds', () => {
		test('Should return an empty list for a workflow without nodes', () => {
			const workflow = (0, workflow_1.getWorkflow)();
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(0);
		});
		test('Should return an empty list for a workflow with nodes without credentials', () => {
			const workflow = (0, workflow_1.getWorkflow)({ addNodeWithoutCreds: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(0);
		});
		test('Should return an element for a node with a credential without access', () => {
			const workflow = (0, workflow_1.getWorkflow)({ addNodeWithOneCred: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});
		test('Should return an empty list for a node with a credential with access', () => {
			const workflow = (0, workflow_1.getWorkflow)({ addNodeWithOneCred: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				workflow_1.FIRST_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(0);
		});
		test('Should return an element for a node with two credentials and mixed access', () => {
			const workflow = (0, workflow_1.getWorkflow)({ addNodeWithTwoCreds: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				workflow_1.SECOND_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});
		test('Should return one node for a workflow with two nodes and two credentials', () => {
			const workflow = (0, workflow_1.getWorkflow)({
				addNodeWithOneCred: true,
				addNodeWithTwoCreds: true,
			});
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				workflow_1.SECOND_CREDENTIAL_ID,
				workflow_1.THIRD_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});
		test('Should return one element for a workflows with two nodes and one credential', () => {
			const workflow = (0, workflow_1.getWorkflow)({
				addNodeWithoutCreds: true,
				addNodeWithOneCred: true,
				addNodeWithTwoCreds: true,
			});
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				workflow_1.FIRST_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});
		test('Should return one element for a workflows with two nodes and partial credential access', () => {
			const workflow = (0, workflow_1.getWorkflow)({
				addNodeWithOneCred: true,
				addNodeWithTwoCreds: true,
			});
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				workflow_1.FIRST_CREDENTIAL_ID,
				workflow_1.SECOND_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});
		test('Should return two elements for a workflows with two nodes and partial credential access', () => {
			const workflow = (0, workflow_1.getWorkflow)({
				addNodeWithOneCred: true,
				addNodeWithTwoCreds: true,
			});
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				workflow_1.SECOND_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(2);
		});
		test('Should return two elements for a workflows with two nodes and no credential access', () => {
			const workflow = (0, workflow_1.getWorkflow)({
				addNodeWithOneCred: true,
				addNodeWithTwoCreds: true,
			});
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(2);
		});
	});
});
//# sourceMappingURL=workflow.service.ee.test.js.map
