import { WorkflowEntity, WorkflowHistory } from '@n8n/db';
import {
	EXECUTE_WORKFLOW_NODE_TYPE,
	WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
	type INode,
} from 'n8n-workflow';

export const FIRST_CREDENTIAL_ID = '1';
export const SECOND_CREDENTIAL_ID = '2';
export const THIRD_CREDENTIAL_ID = '3';

const NODE_WITH_NO_CRED = '0133467b-df4a-473d-9295-fdd9d01fa45a';
const NODE_WITH_ONE_CRED = '4673f869-f2dc-4a33-b053-ca3193bc5226';
const NODE_WITH_TWO_CRED = '9b4208bd-8f10-4a6a-ad3b-da47a326f7da';
const NODE_WITH_INLINE_SUBWORKFLOW_CRED = 'a1f8c2e0-1b2c-4d3e-9f0a-1234567890ab';
const NODE_WITH_WORKFLOW_TOOL_INLINE_CRED = 'b2e9d3f1-2c3d-4e5f-a0b1-234567890abc';
const NODE_WITH_NESTED_INLINE_SUBWORKFLOW_CRED = 'c3f0e4a2-3d4e-5f60-b1c2-34567890abcd';
const NODE_WITH_DEEPLY_NESTED_INLINE_CRED = 'd4a1f5b3-4e5f-6071-c2d3-4567890abcde';

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

// Execute Sub-workflow node whose inline `workflowJson` embeds a sub-workflow
// referencing a credential (FIRST_CREDENTIAL_ID) that is not exposed via the
// node's own top-level `credentials`.
const nodeWithInlineSubworkflowCredential: INode = {
	id: NODE_WITH_INLINE_SUBWORKFLOW_CRED,
	name: 'Execute Sub-workflow',
	typeVersion: 1.2,
	type: EXECUTE_WORKFLOW_NODE_TYPE,
	position: [0, 0],
	parameters: {
		source: 'parameter',
		workflowJson: JSON.stringify({
			nodes: [
				{
					name: 'Steal',
					type: 'n8n-nodes-base.httpRequest',
					typeVersion: 4.2,
					parameters: {},
					credentials: {
						httpHeaderAuth: { id: FIRST_CREDENTIAL_ID, name: 'First fake credential' },
					},
				},
			],
			connections: {},
		}),
	},
};

// Builds the inline `workflowJson` of a sub-workflow containing a single
// HTTP Request node that references `credentialId`.
const inlineWorkflowJson = (credentialId: string) =>
	JSON.stringify({
		nodes: [
			{
				name: 'Steal',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				parameters: {},
				credentials: {
					httpHeaderAuth: { id: credentialId, name: 'Inline fake credential' },
				},
			},
		],
		connections: {},
	});

// Workflow Tool (LangChain) node whose inline `workflowJson` embeds a
// sub-workflow referencing a credential (FIRST_CREDENTIAL_ID) not exposed via
// the node's own top-level `credentials`. Same inline-executor path as the
// Execute Sub-workflow node, so it must be inspected too.
const nodeWithWorkflowToolInlineCredential: INode = {
	id: NODE_WITH_WORKFLOW_TOOL_INLINE_CRED,
	name: 'Workflow Tool',
	typeVersion: 2,
	type: WORKFLOW_TOOL_LANGCHAIN_NODE_TYPE,
	position: [0, 0],
	parameters: {
		source: 'parameter',
		workflowJson: inlineWorkflowJson(FIRST_CREDENTIAL_ID),
	},
};

// Execute Sub-workflow node whose inline sub-workflow itself contains another
// Execute Sub-workflow node with an inline sub-workflow referencing
// SECOND_CREDENTIAL_ID — exercises the recursive walk into nested inline
// workflows.
const nodeWithNestedInlineSubworkflowCredential: INode = {
	id: NODE_WITH_NESTED_INLINE_SUBWORKFLOW_CRED,
	name: 'Execute Sub-workflow (nested)',
	typeVersion: 1.2,
	type: EXECUTE_WORKFLOW_NODE_TYPE,
	position: [0, 0],
	parameters: {
		source: 'parameter',
		workflowJson: JSON.stringify({
			nodes: [
				{
					name: 'Inner Execute Sub-workflow',
					type: EXECUTE_WORKFLOW_NODE_TYPE,
					typeVersion: 1.2,
					parameters: {
						source: 'parameter',
						workflowJson: inlineWorkflowJson(SECOND_CREDENTIAL_ID),
					},
				},
			],
			connections: {},
		}),
	},
};

// Execute Sub-workflow node whose inline sub-workflow nests `depth` further
// inline Execute Sub-workflow nodes, with the credential reference buried at the
// deepest level. Used to prove the credential collector inspects every level and
// never silently stops before reaching the bottom.
const buildDeeplyNestedInlineNode = (depth: number): INode => {
	let workflowJson = inlineWorkflowJson(FIRST_CREDENTIAL_ID);
	for (let i = 0; i < depth; i++) {
		workflowJson = JSON.stringify({
			nodes: [
				{
					name: `Nested Execute Sub-workflow ${i}`,
					type: EXECUTE_WORKFLOW_NODE_TYPE,
					typeVersion: 1.2,
					parameters: { source: 'parameter', workflowJson },
				},
			],
			connections: {},
		});
	}
	return {
		id: NODE_WITH_DEEPLY_NESTED_INLINE_CRED,
		name: 'Execute Sub-workflow (deeply nested)',
		typeVersion: 1.2,
		type: EXECUTE_WORKFLOW_NODE_TYPE,
		position: [0, 0],
		parameters: { source: 'parameter', workflowJson },
	};
};

export function getWorkflow(options?: {
	addNodeWithoutCreds?: boolean;
	addNodeWithOneCred?: boolean;
	addNodeWithTwoCreds?: boolean;
	addNodeWithInlineSubworkflowCred?: boolean;
	addNodeWithWorkflowToolInlineCred?: boolean;
	addNodeWithNestedInlineSubworkflowCred?: boolean;
	addNodeWithDeeplyNestedInlineCred?: boolean;
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

	if (options?.addNodeWithInlineSubworkflowCred) {
		workflow.nodes.push(nodeWithInlineSubworkflowCredential);
	}

	if (options?.addNodeWithWorkflowToolInlineCred) {
		workflow.nodes.push(nodeWithWorkflowToolInlineCredential);
	}

	if (options?.addNodeWithNestedInlineSubworkflowCred) {
		workflow.nodes.push(nodeWithNestedInlineSubworkflowCredential);
	}

	if (options?.addNodeWithDeeplyNestedInlineCred) {
		// 15 levels deep — beyond any small fixed traversal budget.
		workflow.nodes.push(buildDeeplyNestedInlineNode(15));
	}

	return workflow;
}

export function getWorkflowHistory(
	workflow: WorkflowEntity,
	overrides: Partial<WorkflowHistory> | undefined = {},
): WorkflowHistory {
	const workflowHistory = new WorkflowHistory();

	Object.assign(workflowHistory, {
		versionId: 'default-version',
		workflowId: workflow.id,
		nodes: [],
		connections: {},
		authors: 'Test Author',
		name: null,
		description: null,
		autosaved: false,
		workflow,
		workflowPublishHistory: [],
		...overrides,
	});

	return workflowHistory;
}
