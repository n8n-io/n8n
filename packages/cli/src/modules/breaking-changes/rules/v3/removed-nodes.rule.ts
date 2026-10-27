import { createNodeReplacementRule } from './node-replacement-rule';

const replaceWithAnotherMemoryNode = [
	{
		action: 'Replace with another memory node',
		description: 'Replace this node with another memory node.',
	},
];

<<<<<<< HEAD
@BreakingChangeRule({ version: 'v3' })
export class RemovedNodesV3Rule implements IBreakingChangeWorkflowRule {
	private readonly removedNodes = [
		'@n8n/n8n-nodes-langchain.documentGithubLoader',
		'@n8n/n8n-nodes-langchain.memoryMotorhead',
		'n8n-nodes-base.orbit',
		'@n8n/n8n-nodes-langchain.memoryZep',
		'@n8n/n8n-nodes-langchain.vectorStoreZep',
		'@n8n/n8n-nodes-langchain.vectorStoreZepInsert',
		'@n8n/n8n-nodes-langchain.vectorStoreZepLoad',
	];
=======
const replaceWithAnotherVectorStoreNode = [
	{
		action: 'Replace with another vector store node',
		description: 'Replace this node with another vector store node.',
	},
];
>>>>>>> 8ed6f20a (fix(core): Improve removed-node and Edit Image entries in v3 migration report (#42244))

export const GithubDocumentLoaderRemovedRule = createNodeReplacementRule({
	id: 'github-document-loader-removed',
	removedNodeName: 'GitHub Document Loader',
	removedNodeType: '@n8n/n8n-nodes-langchain.documentGithubLoader',
	recommendations: [
		{
			action: 'Replace with GitHub and Default Data Loader',
			description: 'Fetch the content with the GitHub node, then load it with Default Data Loader.',
		},
	],
});

export const MotorheadRemovedRule = createNodeReplacementRule({
	id: 'motorhead-removed',
	removedNodeName: 'Motorhead',
	removedNodeType: '@n8n/n8n-nodes-langchain.memoryMotorhead',
	recommendations: replaceWithAnotherMemoryNode,
});

export const ZepRemovedRule = createNodeReplacementRule({
	id: 'zep-removed',
	removedNodeName: 'Zep',
	removedNodeType: '@n8n/n8n-nodes-langchain.memoryZep',
	recommendations: replaceWithAnotherMemoryNode,
});

export const ZepVectorStoreRemovedRule = createNodeReplacementRule({
	id: 'zep-vector-store-removed',
	removedNodeName: 'Zep Vector Store',
	removedNodeType: '@n8n/n8n-nodes-langchain.vectorStoreZep',
	recommendations: replaceWithAnotherVectorStoreNode,
});

export const ZepVectorStoreInsertRemovedRule = createNodeReplacementRule({
	id: 'zep-vector-store-insert-removed',
	removedNodeName: 'Zep Vector Store: Insert',
	removedNodeType: '@n8n/n8n-nodes-langchain.vectorStoreZepInsert',
	recommendations: replaceWithAnotherVectorStoreNode,
});

export const ZepVectorStoreLoadRemovedRule = createNodeReplacementRule({
	id: 'zep-vector-store-load-removed',
	removedNodeName: 'Zep Vector Store: Load',
	removedNodeType: '@n8n/n8n-nodes-langchain.vectorStoreZepLoad',
	recommendations: replaceWithAnotherVectorStoreNode,
});

export const OrbitRemovedRule = createNodeReplacementRule({
	id: 'orbit-removed',
	removedNodeName: 'Orbit',
	removedNodeType: 'n8n-nodes-base.orbit',
	recommendations: [
		{
			action: 'Remove the node',
			description:
				'Remove this node. The Orbit service shut down, so this node has no replacement.',
		},
	],
});

export const LangChainCodeRemovedRule = createNodeReplacementRule({
	id: 'langchain-code-removed',
	removedNodeName: 'LangChain Code',
	removedNodeType: '@n8n/n8n-nodes-langchain.code',
	recommendations: [
		{
			action: 'Rebuild the node logic',
			description: 'This node has no direct replacement. Rebuild its logic with other nodes.',
		},
	],
});

export const removedNodeRules = [
	{
		rule: GithubDocumentLoaderRemovedRule,
		removedNodeType: '@n8n/n8n-nodes-langchain.documentGithubLoader',
	},
	{ rule: MotorheadRemovedRule, removedNodeType: '@n8n/n8n-nodes-langchain.memoryMotorhead' },
	{ rule: ZepRemovedRule, removedNodeType: '@n8n/n8n-nodes-langchain.memoryZep' },
	{ rule: ZepVectorStoreRemovedRule, removedNodeType: '@n8n/n8n-nodes-langchain.vectorStoreZep' },
	{
		rule: ZepVectorStoreInsertRemovedRule,
		removedNodeType: '@n8n/n8n-nodes-langchain.vectorStoreZepInsert',
	},
	{
		rule: ZepVectorStoreLoadRemovedRule,
		removedNodeType: '@n8n/n8n-nodes-langchain.vectorStoreZepLoad',
	},
	{ rule: OrbitRemovedRule, removedNodeType: 'n8n-nodes-base.orbit' },
	{ rule: LangChainCodeRemovedRule, removedNodeType: '@n8n/n8n-nodes-langchain.code' },
];
