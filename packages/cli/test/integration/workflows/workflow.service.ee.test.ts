import Container from 'typedi';
import { mock } from 'jest-mock-extended';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import { CredentialsRepository } from '@db/repositories/credentials.repository';
import { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import { WorkflowRepository } from '@db/repositories/workflow.repository';
import { Telemetry } from '@/telemetry';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

import * as testDb from '../shared/testDb';
import { mockInstance } from '../../shared/mocking';
import {
	FIRST_CREDENTIAL_ID,
	SECOND_CREDENTIAL_ID,
	THIRD_CREDENTIAL_ID,
	getWorkflow,
} from '../shared/workflow';

describe('EnterpriseWorkflowService', () => {
	let service: EnterpriseWorkflowService;

	beforeAll(async () => {
		await testDb.init();
		mockInstance(Telemetry);

		service = new EnterpriseWorkflowService(
			mock(),
			Container.get(SharedWorkflowRepository),
			Container.get(WorkflowRepository),
			Container.get(CredentialsRepository),
			mock(),
			mock(),
		);
	});

	afterEach(async () => {
		await testDb.truncate(['Workflow']);
		jest.restoreAllMocks();
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('validateWorkflowCredentialUsage', () => {
		function generateCredentialEntity(credentialId: string) {
			const credentialEntity = new CredentialsEntity();
			credentialEntity.id = credentialId;
			return credentialEntity;
		}

		it('Should throw error saving a workflow using credential without access', () => {
			const newWorkflowVersion = getWorkflow({ addNodeWithOneCred: true });
			const previousWorkflowVersion = getWorkflow();
			expect(() => {
				service.validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, []);
			}).toThrow();
		});

		it('Should not throw error when saving a workflow using credential with access', () => {
			const newWorkflowVersion = getWorkflow({ addNodeWithOneCred: true });
			const previousWorkflowVersion = getWorkflow();
			expect(() => {
				service.validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, [
					generateCredentialEntity('1'),
				]);
			}).not.toThrow();
		});

		it('Should not throw error when saving a workflow removing node without credential access', () => {
			const newWorkflowVersion = getWorkflow();
			const previousWorkflowVersion = getWorkflow({ addNodeWithOneCred: true });
			expect(() => {
				service.validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, [
					generateCredentialEntity('1'),
				]);
			}).not.toThrow();
		});

		it('Should save fine when not making changes to workflow without access', () => {
			const workflowWithOneCredential = getWorkflow({ addNodeWithOneCred: true });
			expect(() => {
				service.validateWorkflowCredentialUsage(
					workflowWithOneCredential,
					workflowWithOneCredential,
					[],
				);
			}).not.toThrow();
		});

		it('Should throw error saving a workflow adding node without credential access', () => {
			const newWorkflowVersion = getWorkflow({
				addNodeWithOneCred: true,
				addNodeWithTwoCreds: true,
			});
			const previousWorkflowVersion = getWorkflow({ addNodeWithOneCred: true });
			expect(() => {
				service.validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, []);
			}).toThrow();
		});
	});

	describe('getNodesWithInaccessibleCreds', () => {
		test('Should return an empty list for a workflow without nodes', () => {
			const workflow = getWorkflow();
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(0);
		});

		test('Should return an empty list for a workflow with nodes without credentials', () => {
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(0);
		});

		test('Should return an element for a node with a credential without access', () => {
			const workflow = getWorkflow({ addNodeWithOneCred: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});

		test('Should return an empty list for a node with a credential with access', () => {
			const workflow = getWorkflow({ addNodeWithOneCred: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				FIRST_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(0);
		});

		test('Should return an element for a node with two credentials and mixed access', () => {
			const workflow = getWorkflow({ addNodeWithTwoCreds: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				SECOND_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});

		test('Should return one node for a workflow with two nodes and two credentials', () => {
			const workflow = getWorkflow({ addNodeWithOneCred: true, addNodeWithTwoCreds: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				SECOND_CREDENTIAL_ID,
				THIRD_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});

		test('Should return one element for a workflows with two nodes and one credential', () => {
			const workflow = getWorkflow({
				addNodeWithoutCreds: true,
				addNodeWithOneCred: true,
				addNodeWithTwoCreds: true,
			});
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				FIRST_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});

		test('Should return one element for a workflows with two nodes and partial credential access', () => {
			const workflow = getWorkflow({ addNodeWithOneCred: true, addNodeWithTwoCreds: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				FIRST_CREDENTIAL_ID,
				SECOND_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});

		test('Should return two elements for a workflows with two nodes and partial credential access', () => {
			const workflow = getWorkflow({ addNodeWithOneCred: true, addNodeWithTwoCreds: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				SECOND_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(2);
		});

		test('Should return two elements for a workflows with two nodes and no credential access', () => {
			const workflow = getWorkflow({ addNodeWithOneCred: true, addNodeWithTwoCreds: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(2);
		});
	});
});
