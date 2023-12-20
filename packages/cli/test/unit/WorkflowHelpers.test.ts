import type { INode } from 'n8n-workflow';
import { type Workflow } from 'n8n-workflow';
import { WorkflowEntity } from '@db/entities/WorkflowEntity';
import { CredentialsEntity } from '@db/entities/CredentialsEntity';
import {
	getExecutionStartNode,
	getNodesWithInaccessibleCreds,
	validateWorkflowCredentialUsage,
} from '@/WorkflowHelpers';
import type { IWorkflowExecutionDataProcess } from '@/Interfaces';

const FIRST_CREDENTIAL_ID = '1';
const SECOND_CREDENTIAL_ID = '2';
const THIRD_CREDENTIAL_ID = '3';

const NODE_WITH_NO_CRED = '0133467b-df4a-473d-9295-fdd9d01fa45a';
const NODE_WITH_ONE_CRED = '4673f869-f2dc-4a33-b053-ca3193bc5226';
const NODE_WITH_TWO_CRED = '9b4208bd-8f10-4a6a-ad3b-da47a326f7da';

describe('WorkflowHelpers', () => {
	describe('getNodesWithInaccessibleCreds', () => {
		test('Should return an empty list for a workflow without nodes', () => {
			const workflow = getWorkflow();
			const nodesWithInaccessibleCreds = getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(0);
		});

		test('Should return an empty list for a workflow with nodes without credentials', () => {
			const workflow = getWorkflow({ addNodeWithoutCreds: true });
			const nodesWithInaccessibleCreds = getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(0);
		});

		test('Should return an element for a node with a credential without access', () => {
			const workflow = getWorkflow({ addNodeWithOneCred: true });
			const nodesWithInaccessibleCreds = getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});

		test('Should return an empty list for a node with a credential with access', () => {
			const workflow = getWorkflow({ addNodeWithOneCred: true });
			const nodesWithInaccessibleCreds = getNodesWithInaccessibleCreds(workflow, [
				FIRST_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(0);
		});

		test('Should return an element for a node with two credentials and mixed access', () => {
			const workflow = getWorkflow({ addNodeWithTwoCreds: true });
			const nodesWithInaccessibleCreds = getNodesWithInaccessibleCreds(workflow, [
				SECOND_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});

		test('Should return one node for a workflow with two nodes and two credentials', () => {
			const workflow = getWorkflow({ addNodeWithOneCred: true, addNodeWithTwoCreds: true });
			const nodesWithInaccessibleCreds = getNodesWithInaccessibleCreds(workflow, [
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
			const nodesWithInaccessibleCreds = getNodesWithInaccessibleCreds(workflow, [
				FIRST_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});

		test('Should return one element for a workflows with two nodes and partial credential access', () => {
			const workflow = getWorkflow({ addNodeWithOneCred: true, addNodeWithTwoCreds: true });
			const nodesWithInaccessibleCreds = getNodesWithInaccessibleCreds(workflow, [
				FIRST_CREDENTIAL_ID,
				SECOND_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(1);
		});

		test('Should return two elements for a workflows with two nodes and partial credential access', () => {
			const workflow = getWorkflow({ addNodeWithOneCred: true, addNodeWithTwoCreds: true });
			const nodesWithInaccessibleCreds = getNodesWithInaccessibleCreds(workflow, [
				SECOND_CREDENTIAL_ID,
			]);
			expect(nodesWithInaccessibleCreds).toHaveLength(2);
		});

		test('Should return two elements for a workflows with two nodes and no credential access', () => {
			const workflow = getWorkflow({ addNodeWithOneCred: true, addNodeWithTwoCreds: true });
			const nodesWithInaccessibleCreds = getNodesWithInaccessibleCreds(workflow, []);
			expect(nodesWithInaccessibleCreds).toHaveLength(2);
		});
	});

	describe('validateWorkflowCredentialUsage', () => {
		it('Should throw error saving a workflow using credential without access', () => {
			const newWorkflowVersion = getWorkflow({ addNodeWithOneCred: true });
			const previousWorkflowVersion = getWorkflow();
			expect(() => {
				validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, []);
			}).toThrow();
		});

		it('Should not throw error when saving a workflow using credential with access', () => {
			const newWorkflowVersion = getWorkflow({ addNodeWithOneCred: true });
			const previousWorkflowVersion = getWorkflow();
			expect(() => {
				validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, [
					generateCredentialEntity(FIRST_CREDENTIAL_ID),
				]);
			}).not.toThrow();
		});

		it('Should not throw error when saving a workflow removing node without credential access', () => {
			const newWorkflowVersion = getWorkflow();
			const previousWorkflowVersion = getWorkflow({ addNodeWithOneCred: true });
			expect(() => {
				validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, [
					generateCredentialEntity(FIRST_CREDENTIAL_ID),
				]);
			}).not.toThrow();
		});

		it('Should save fine when not making changes to workflow without access', () => {
			const workflowWithOneCredential = getWorkflow({ addNodeWithOneCred: true });
			expect(() => {
				validateWorkflowCredentialUsage(workflowWithOneCredential, workflowWithOneCredential, []);
			}).not.toThrow();
		});

		it('Should throw error saving a workflow adding node without credential access', () => {
			const newWorkflowVersion = getWorkflow({
				addNodeWithOneCred: true,
				addNodeWithTwoCreds: true,
			});
			const previousWorkflowVersion = getWorkflow({ addNodeWithOneCred: true });
			expect(() => {
				validateWorkflowCredentialUsage(newWorkflowVersion, previousWorkflowVersion, []);
			}).toThrow();
		});
	});
	describe('getExecutionStartNode', () => {
		it('Should return undefined', () => {
			const data = {
				pinData: {},
				startNodes: [],
			} as unknown as IWorkflowExecutionDataProcess;
			const workflow = {
				getNode(nodeName: string) {
					return {
						name: nodeName,
					};
				},
			} as unknown as Workflow;
			const executionStartNode = getExecutionStartNode(data, workflow);
			expect(executionStartNode).toBeUndefined();
		});
		it('Should return startNode', () => {
			const data = {
				pinData: {
					node1: {},
					node2: {},
				},
				startNodes: ['node2'],
			} as unknown as IWorkflowExecutionDataProcess;
			const workflow = {
				getNode(nodeName: string) {
					if (nodeName === 'node2') {
						return {
							name: 'node2',
						};
					}
					return undefined;
				},
			} as unknown as Workflow;
			const executionStartNode = getExecutionStartNode(data, workflow);
			expect(executionStartNode).toEqual({
				name: 'node2',
			});
		});
	});
});

function generateCredentialEntity(credentialId: string) {
	const credentialEntity = new CredentialsEntity();
	credentialEntity.id = credentialId;
	return credentialEntity;
}

export function getWorkflow(options?: {
	addNodeWithoutCreds?: boolean;
	addNodeWithOneCred?: boolean;
	addNodeWithTwoCreds?: boolean;
}) {
	const workflow = new WorkflowEntity();

	workflow.nodes = [];

	if (options?.addNodeWithoutCreds) {
		workflow.nodes.push(nodeWithNoCredentials);
	}

	if (options?.addNodeWithOneCred) {
		workflow.nodes.push(nodeWithOneCredential);
	}

	if (options?.addNodeWithTwoCreds) {
		workflow.nodes.push(nodeWithTwoCredentials);
	}

	return workflow;
}

const nodeWithNoCredentials: INode = {
	id: NODE_WITH_NO_CRED,
	name: 'Node with no Credential',
	typeVersion: 1,
	type: 'n8n-nodes-base.fakeNode',
	position: [0, 0],
	credentials: {},
	parameters: {},
};

const nodeWithOneCredential: INode = {
	id: NODE_WITH_ONE_CRED,
	name: 'Node with a single credential',
	typeVersion: 1,
	type: '',
	position: [0, 0],
	credentials: {
		test: {
			id: FIRST_CREDENTIAL_ID,
			name: 'First fake credential',
		},
	},
	parameters: {},
};

const nodeWithTwoCredentials: INode = {
	id: NODE_WITH_TWO_CRED,
	name: 'Node with two credentials',
	typeVersion: 1,
	type: '',
	position: [0, 0],
	credentials: {
		mcTest: {
			id: SECOND_CREDENTIAL_ID,
			name: 'Second fake credential',
		},
		mcTest2: {
			id: THIRD_CREDENTIAL_ID,
			name: 'Third fake credential',
		},
	},
	parameters: {},
};
