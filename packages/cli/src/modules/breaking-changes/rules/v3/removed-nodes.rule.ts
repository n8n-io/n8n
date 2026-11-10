import { createNodeReplacementRule } from './node-replacement-rule';

const replaceWithAnotherMemoryNode = [
	{
		action: 'Replace with another memory node',
		description: 'Replace this node with another memory node.',
	},
];

const replaceWithAnotherVectorStoreNode = [
	{
		action: 'Replace with another vector store node',
		description: 'Replace this node with another vector store node.',
	},
];

export const GithubDocumentLoaderRemovedRule = createNodeReplacementRule({
	id: 'github-document-loader-removed',
	removedNodeName: 'GitHub Document Loader',
	removedNodeType: '@n8n/n8n-nodes-langchain.documentGithubLoader',
	assistant: 'review',
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
	assistant: 'review',
	recommendations: replaceWithAnotherMemoryNode,
});

export const ZepRemovedRule = createNodeReplacementRule({
	id: 'zep-removed',
	removedNodeName: 'Zep',
	removedNodeType: '@n8n/n8n-nodes-langchain.memoryZep',
	assistant: 'review',
	recommendations: replaceWithAnotherMemoryNode,
});

export const ZepVectorStoreRemovedRule = createNodeReplacementRule({
	id: 'zep-vector-store-removed',
	removedNodeName: 'Zep Vector Store',
	removedNodeType: '@n8n/n8n-nodes-langchain.vectorStoreZep',
	assistant: 'review',
	recommendations: replaceWithAnotherVectorStoreNode,
});

export const ZepVectorStoreInsertRemovedRule = createNodeReplacementRule({
	id: 'zep-vector-store-insert-removed',
	removedNodeName: 'Zep Vector Store: Insert',
	removedNodeType: '@n8n/n8n-nodes-langchain.vectorStoreZepInsert',
	assistant: 'review',
	recommendations: replaceWithAnotherVectorStoreNode,
});

export const ZepVectorStoreLoadRemovedRule = createNodeReplacementRule({
	id: 'zep-vector-store-load-removed',
	removedNodeName: 'Zep Vector Store: Load',
	removedNodeType: '@n8n/n8n-nodes-langchain.vectorStoreZepLoad',
	assistant: 'review',
	recommendations: replaceWithAnotherVectorStoreNode,
});

export const OrbitRemovedRule = createNodeReplacementRule({
	id: 'orbit-removed',
	removedNodeName: 'Orbit',
	removedNodeType: 'n8n-nodes-base.orbit',
	assistant: 'review',
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
	assistant: 'review',
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
