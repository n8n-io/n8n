import { testDb, mockInstance } from '@n8n/backend-test-utils';
import {
	CredentialsEntity,
	CredentialsRepository,
	SharedWorkflowRepository,
	WorkflowEntity,
	WorkflowRepository,
} from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';

import { UninspectableSubworkflowSourceError } from '@/errors/uninspectable-subworkflow-source.error';
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
			mock(),
			Container.get(SharedWorkflowRepository),
			Container.get(WorkflowRepository),
			Container.get(CredentialsRepository),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
			mock(),
		);
	});

	afterEach(async () => {
		await testDb.truncate(['WorkflowEntity']);
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

		test('Should flag a Workflow Retriever node referencing an inaccessible credential inside its inline workflow JSON', () => {
			const workflow = getWorkflow({ addNodeWithWorkflowRetrieverInlineCred: true });
			const nodesWithInaccessibleCreds = service.getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});

		test('Should not flag a Workflow Retriever node when the inline credential is accessible', () => {
			const workflow = getWorkflow({ addNodeWithWorkflowRetrieverInlineCred: true });
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

	describe('sub-workflow source', () => {
		const subworkflowNode = (parameters: INode['parameters'], typeVersion = 1.1): INode => ({
			id: 'b4a1c2d3-0000-4000-8000-000000000001',
			name: 'Sub',
			type: 'n8n-nodes-base.executeWorkflow',
			typeVersion,
			position: [0, 0],
			parameters,
		});

		const urlNode = () =>
			subworkflowNode({ source: 'url', workflowUrl: 'https://example.com/workflow.json' });

		const workflowWithNodes = (nodes: INode[]) => {
			const workflow = new WorkflowEntity();
			workflow.nodes = nodes;
			return workflow;
		};

		test.each([
			['url', { source: 'url', workflowUrl: 'https://example.com/workflow.json' }],
			['localFile', { source: 'localFile', workflowPath: '/data/workflow.json' }],
			['an expression', { source: '={{ "url" }}' }],
			['a non-string value', { source: 1 }],
		])('Should flag a node whose source is %s', (_, parameters) => {
			const workflow = workflowWithNodes([subworkflowNode(parameters as INode['parameters'])]);
			expect(service.getNodesWithInaccessibleCreds(workflow, [])).toHaveLength(1);
		});

		test.each([
			['missing', {}],
			['database', { source: 'database', workflowId: '1' }],
			['parameter', { source: 'parameter', workflowJson: '{"nodes":[],"connections":{}}' }],
		])('Should not flag a node whose source is %s', (_, parameters) => {
			const workflow = workflowWithNodes([subworkflowNode(parameters as INode['parameters'])]);
			expect(service.getNodesWithInaccessibleCreds(workflow, [])).toHaveLength(0);
		});

		test('Should flag a url source nested in inline workflow JSON', () => {
			const workflowJson = JSON.stringify({ nodes: [urlNode()], connections: {} });
			const workflow = workflowWithNodes([subworkflowNode({ source: 'parameter', workflowJson })]);
			expect(service.getNodesWithInaccessibleCreds(workflow, [])).toHaveLength(1);
		});

		test('Should not flag a url source when the user may use every credential', () => {
			const workflow = workflowWithNodes([urlNode()]);
			expect(service.getNodesWithInaccessibleCreds(workflow, [], true)).toHaveLength(0);
		});

		test('Should reject a new url source node with a specific error', () => {
			expect(() => {
				service.validateWorkflowCredentialUsage(
					workflowWithNodes([urlNode()]),
					workflowWithNodes([]),
					[],
				);
			}).toThrow(UninspectableSubworkflowSourceError);
		});

		test('Should restore a stored url source node that the user changed', () => {
			const changedNode = urlNode();
			changedNode.parameters.workflowUrl = 'https://example.org/other.json';
			const newWorkflowVersion = workflowWithNodes([changedNode]);

			service.validateWorkflowCredentialUsage(
				newWorkflowVersion,
				workflowWithNodes([urlNode()]),
				[],
			);

			expect(newWorkflowVersion.nodes[0].parameters.workflowUrl).toBe(
				'https://example.com/workflow.json',
			);
		});

		test('Should keep a new url source node when the user may use every credential', () => {
			const newWorkflowVersion = workflowWithNodes([urlNode()]);
			expect(() => {
				service.validateWorkflowCredentialUsage(
					newWorkflowVersion,
					workflowWithNodes([]),
					[],
					true,
				);
			}).not.toThrow();
			expect(newWorkflowVersion.nodes).toHaveLength(1);
		});

		describe('workflow JSON of the parameter source', () => {
			const WORKFLOW_JSON = JSON.stringify({ nodes: [], connections: {} });
			const inlineNode = (workflowJson: unknown) =>
				subworkflowNode({ source: 'parameter', workflowJson } as INode['parameters']);

			test.each([
				['an expression', '={{ $json.wf }}'],
				['an array holding workflow JSON', [WORKFLOW_JSON]],
				['an array holding an expression', ['={{ $json.wf }}']],
				['an object', { nodes: [], connections: {} }],
			])('Should flag a node whose workflow JSON is %s', (_, workflowJson) => {
				const workflow = workflowWithNodes([inlineNode(workflowJson)]);
				expect(service.getNodesWithInaccessibleCreds(workflow, [])).toHaveLength(1);
			});

			test.each([
				['absent', undefined],
				['fixed JSON', WORKFLOW_JSON],
				['fixed text that is not JSON', 'not json'],
			])('Should not flag a node whose workflow JSON is %s', (_, workflowJson) => {
				const workflow = workflowWithNodes([inlineNode(workflowJson)]);
				expect(service.getNodesWithInaccessibleCreds(workflow, [])).toHaveLength(0);
			});

			test('Should not flag an expression left in the workflow JSON of a database source', () => {
				// The node reads the workflow JSON only for the parameter source.
				const node = subworkflowNode({
					source: 'database',
					workflowId: '1',
					workflowJson: '={{ $json.wf }}',
				});
				expect(service.getNodesWithInaccessibleCreds(workflowWithNodes([node]), [])).toHaveLength(
					0,
				);
			});

			test.each([
				['Workflow Tool', '@n8n/n8n-nodes-langchain.toolWorkflow'],
				['Workflow Retriever', '@n8n/n8n-nodes-langchain.retrieverWorkflow'],
			])('Should flag a %s node whose workflow JSON is an expression', (_, type) => {
				const node = { ...inlineNode('={{ $json.wf }}'), type, typeVersion: 2 };
				expect(service.getNodesWithInaccessibleCreds(workflowWithNodes([node]), [])).toHaveLength(
					1,
				);
			});

			test('Should flag an expression in the workflow JSON of a nested inline sub-workflow', () => {
				const inner = { ...inlineNode('={{ $json.wf }}'), id: 'inner', name: 'Inner' };
				const outer = inlineNode(JSON.stringify({ nodes: [inner], connections: {} }));
				expect(service.getNodesWithInaccessibleCreds(workflowWithNodes([outer]), [])).toHaveLength(
					1,
				);
			});

			test('Should reject a new node whose workflow JSON is an expression', () => {
				expect(() => {
					service.validateWorkflowCredentialUsage(
						workflowWithNodes([inlineNode('={{ $json.wf }}')]),
						workflowWithNodes([]),
						[],
					);
				}).toThrow(UninspectableSubworkflowSourceError);
			});

			test('Should keep a new expression node when the user may use every credential', () => {
				expect(() => {
					service.validateWorkflowCredentialUsage(
						workflowWithNodes([inlineNode('={{ $json.wf }}')]),
						workflowWithNodes([]),
						[],
						true,
					);
				}).not.toThrow();
			});
		});
	});
});
