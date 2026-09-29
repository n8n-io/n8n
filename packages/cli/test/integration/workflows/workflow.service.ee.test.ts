import { testDb, mockInstance } from '@n8n/backend-test-utils';
import {
	CredentialsEntity,
	CredentialsRepository,
	SharedWorkflowRepository,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { Telemetry } from '@/telemetry';
import { EnterpriseWorkflowService } from '@/workflows/workflow.service.ee';

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
			mock(), // logger
			Container.get(SharedWorkflowRepository),
			Container.get(WorkflowRepository),
			Container.get(CredentialsRepository),
			mock(), // credentialsService
			mock(), // ownershipService
			mock(), // projectService
			mock(), // activeWorkflowManager
			mock(), // credentialsFinderService
			mock(), // enterpriseCredentialsService
			mock(), // workflowFinderService
			mock(), // folderRepository
			mock(), // workflowPublishHistoryRepository
			mock(), // workflowMutationHooks
			mock(), // policyEnforcementService
		);
	});

	afterEach(async () => {
		await testDb.truncate(['WorkflowEntity']);
		vi.restoreAllMocks();
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

		const STORED_NODE_ID = '4673f869-f2dc-4a33-b053-ca3193bc5226';

		const inaccessibleCredential = {
			test: { id: FIRST_CREDENTIAL_ID, name: 'First fake credential' },
		};

		const makeNode = (overrides: Partial<INode>): INode => ({
			id: STORED_NODE_ID,
			name: 'Node',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
			...overrides,
		});

		const workflowWithNodes = (nodes: INode[]) => {
			const workflow = new WorkflowEntity();
			workflow.nodes = nodes;
			return workflow;
		};

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

		it('Should throw error saving a workflow adding an Execute Sub-workflow node whose inline JSON uses an inaccessible credential', () => {
			const newWorkflowVersion = getWorkflow({ addNodeWithInlineSubworkflowCred: true });
			const previousWorkflowVersion = getWorkflow();
			expect(() => {
				service.validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, []);
			}).toThrow();
		});

		it('Should reject a repeated node id when both claimants use the credential', () => {
			const previousWorkflowVersion = workflowWithNodes([
				makeNode({ id: STORED_NODE_ID, name: 'First', credentials: inaccessibleCredential }),
			]);
			const newWorkflowVersion = workflowWithNodes([
				makeNode({ id: STORED_NODE_ID, name: 'First', credentials: inaccessibleCredential }),
				makeNode({
					id: STORED_NODE_ID,
					name: 'Second',
					credentials: inaccessibleCredential,
					parameters: { url: 'https://example.com/' },
				}),
			]);

			expect(() => {
				service.validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, []);
			}).toThrow();
		});

		// Only one claimant is checked here, so the id count has to cover every submitted node.
		it('Should reject a repeated node id when only one claimant uses the credential', () => {
			const previousWorkflowVersion = workflowWithNodes([
				makeNode({ id: STORED_NODE_ID, name: 'First', credentials: inaccessibleCredential }),
			]);
			const newWorkflowVersion = workflowWithNodes([
				makeNode({ id: STORED_NODE_ID, name: 'First' }),
				makeNode({
					id: STORED_NODE_ID,
					name: 'Second',
					credentials: inaccessibleCredential,
					parameters: { url: 'https://example.com/' },
				}),
			]);

			expect(() => {
				service.validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, []);
			}).toThrow();
		});

		it('Should not keep submitted fields that the stored node does not have', () => {
			const storedNode = makeNode({ id: STORED_NODE_ID, credentials: inaccessibleCredential });
			delete (storedNode as Partial<INode>).parameters;

			const previousWorkflowVersion = workflowWithNodes([storedNode]);
			const newWorkflowVersion = workflowWithNodes([
				{ ...storedNode, parameters: { url: 'https://example.com/' } },
			]);

			service.validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, []);

			expect(newWorkflowVersion.nodes[0].parameters).toBeUndefined();
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

		test('Should flag an Execute Sub-workflow node referencing an inaccessible credential inside its inline workflow JSON', () => {
			const workflow = getWorkflow({ addNodeWithInlineSubworkflowCred: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});

		test('Should not flag an Execute Sub-workflow node when the inline credential is accessible', () => {
			const workflow = getWorkflow({ addNodeWithInlineSubworkflowCred: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				FIRST_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(0);
		});

		test('Should flag a Workflow Tool node referencing an inaccessible credential inside its inline workflow JSON', () => {
			const workflow = getWorkflow({ addNodeWithWorkflowToolInlineCred: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});

		test('Should not flag a Workflow Tool node when the inline credential is accessible', () => {
			const workflow = getWorkflow({ addNodeWithWorkflowToolInlineCred: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				FIRST_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(0);
		});

		test('Should flag a node referencing an inaccessible credential inside a nested inline sub-workflow', () => {
			const workflow = getWorkflow({ addNodeWithNestedInlineSubworkflowCred: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});

		test('Should not flag a nested inline sub-workflow when the credential is accessible', () => {
			const workflow = getWorkflow({ addNodeWithNestedInlineSubworkflowCred: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				SECOND_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(0);
		});

		test('Should flag an inaccessible credential buried in a deeply nested inline sub-workflow', () => {
			const workflow = getWorkflow({ addNodeWithDeeplyNestedInlineCred: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});

		test('Should not flag a deeply nested inline sub-workflow when the credential is accessible', () => {
			const workflow = getWorkflow({ addNodeWithDeeplyNestedInlineCred: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, [
				FIRST_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(0);
		});
	});
});
