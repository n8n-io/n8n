import { NodeConnectionTypes, type INodeTypeDescription } from 'n8n-workflow';
import { NodeTypeParser } from '../../utils/node-type-parser';
import { createCodeBuilderSearchTool } from '../code-builder-search.tool';

// Mock node type with resource/operation pattern (like Freshservice)
const mockFreshserviceNode: INodeTypeDescription = {
	name: 'n8n-nodes-base.freshservice',
	displayName: 'Freshservice',
	description: 'Consume Freshservice API',
	group: ['output'],
	version: 1,
	defaults: { name: 'Freshservice' },
	inputs: ['main'],
	outputs: ['main'],
	credentials: [{ name: 'freshserviceApi', required: true }],
	properties: [
		{
			displayName: 'Resource',
			name: 'resource',
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Ticket', value: 'ticket' },
				{ name: 'Agent', value: 'agent' },
			],
			default: 'ticket',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: ['ticket'] } },
			options: [
				{ name: 'Get', value: 'get', description: 'Get a ticket' },
				{ name: 'Create', value: 'create', description: 'Create a ticket' },
				{ name: 'Delete', value: 'delete', description: 'Delete a ticket' },
			],
			default: 'get',
		},
		{
			displayName: 'Operation',
			name: 'operation',
			type: 'options',
			noDataExpression: true,
			displayOptions: { show: { resource: ['agent'] } },
			options: [
				{ name: 'Get', value: 'get', description: 'Get an agent' },
				{ name: 'Create', value: 'create', description: 'Create an agent' },
			],
			default: 'get',
		},
	],
};

// Mock node with mode discriminator (like Code node)
const mockCodeNode: INodeTypeDescription = {
	name: 'n8n-nodes-base.code',
	displayName: 'Code',
	description: 'Run custom JavaScript code',
	group: ['transform'],
	version: 2,
	defaults: { name: 'Code' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Mode',
			name: 'mode',
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Run Once for All Items', value: 'runOnceForAllItems' },
				{ name: 'Run Once for Each Item', value: 'runOnceForEachItem' },
			],
			default: 'runOnceForAllItems',
		},
	],
};

// Mock node without discriminators (like HTTP Request)
const mockHttpRequestNode: INodeTypeDescription = {
	name: 'n8n-nodes-base.httpRequest',
	displayName: 'HTTP Request',
	description: 'Makes HTTP requests and returns the response data',
	group: ['transform'],
	version: 4,
	defaults: { name: 'HTTP Request' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Method',
			name: 'method',
			type: 'options',
			options: [
				{ name: 'GET', value: 'GET' },
				{ name: 'POST', value: 'POST' },
			],
			default: 'GET',
		},
	],
};

// Mock vector store node with mode discriminator that includes outputConnectionType
const mockVectorStoreNode: INodeTypeDescription = {
	name: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
	displayName: 'Pinecone Vector Store',
	description: 'Work with your data in Pinecone Vector Store',
	group: ['transform'],
	version: 1,
	defaults: { name: 'Pinecone Vector Store' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [
		{
			displayName: 'Operation Mode',
			name: 'mode',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Get Many',
					value: 'load',
					description: 'Get many ranked documents from vector store for query',
				},
				{
					name: 'Insert Documents',
					value: 'insert',
					description: 'Insert documents into vector store',
				},
				{
					name: 'Retrieve Documents (As Vector Store for Chain/Tool)',
					value: 'retrieve',
					description:
						'Retrieve documents from vector store to be used as vector store with AI nodes',
					outputConnectionType: NodeConnectionTypes.AiVectorStore,
				},
				{
					name: 'Retrieve Documents (As Tool for AI Agent)',
					value: 'retrieve-as-tool',
					description: 'Retrieve documents from vector store to be used as tool with AI nodes',
					outputConnectionType: NodeConnectionTypes.AiTool,
				},
				{
					name: 'Update Documents',
					value: 'update',
					description: 'Update documents in vector store by ID',
				},
			],
			default: 'load',
		},
	],
};

// Mock nodes for builder hint tests
const mockFormTriggerNode: INodeTypeDescription = {
	name: 'n8n-nodes-base.formTrigger',
	displayName: 'n8n Form Trigger',
	description: 'Trigger workflows with an n8n Form submission',
	group: ['trigger'],
	version: 2,
	defaults: { name: 'n8n Form Trigger' },
	inputs: [],
	outputs: ['main'],
	properties: [],
	builderHint: {
		message:
			'Use with n8n-nodes-base.form to build a full form experience, with pages and final page',
		relatedNodes: ['n8n-nodes-base.form'],
	},
};

const mockFormNode: INodeTypeDescription = {
	name: 'n8n-nodes-base.form',
	displayName: 'n8n Form',
	description: 'Create a multi-page form for the Form Trigger',
	group: ['input'],
	version: 1,
	defaults: { name: 'n8n Form' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [],
	builderHint: {
		message:
			'Use with n8n-nodes-base.formTrigger to build a full form experience. Form node creates additional pages/steps after the trigger',
		relatedNodes: ['n8n-nodes-base.formTrigger'],
	},
};

const mockRespondToWebhookNode: INodeTypeDescription = {
	name: 'n8n-nodes-base.respondToWebhook',
	displayName: 'Respond to Webhook',
	description: 'Send custom response to a Webhook or Form Trigger',
	group: ['transform'],
	version: 1,
	defaults: { name: 'Respond to Webhook' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [],
	builderHint: {
		message:
			'Only works with webhook node (n8n-nodes-base.webhook) with responseMode set to "responseNode"',
		relatedNodes: ['n8n-nodes-base.webhook'],
	},
};

const mockWebhookNode: INodeTypeDescription = {
	name: 'n8n-nodes-base.webhook',
	displayName: 'Webhook',
	description: 'Starts the workflow on a webhook call',
	group: ['trigger'],
	version: 2,
	defaults: { name: 'Webhook' },
	inputs: [],
	outputs: ['main'],
	properties: [],
};

// Mock AI Agent node with builderHint for structured output
const mockAgentNode: INodeTypeDescription = {
	name: '@n8n/n8n-nodes-langchain.agent',
	displayName: 'AI Agent',
	description: 'Generates an action plan and executes it. Can use external tools.',
	group: ['transform'],
	version: 3.1,
	defaults: { name: 'AI Agent' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [],
	builderHint: {
		message:
			'Use with @n8n/n8n-nodes-langchain.outputParserStructured to get structured JSON output from the agent',
		relatedNodes: ['@n8n/n8n-nodes-langchain.outputParserStructured'],
	},
};

// Mock Output Parser Structured node
const mockOutputParserStructuredNode: INodeTypeDescription = {
	name: '@n8n/n8n-nodes-langchain.outputParserStructured',
	displayName: 'Structured Output Parser',
	description: 'Parse the output of a language model into a structured format using a JSON schema',
	group: ['transform'],
	version: 1.2,
	defaults: { name: 'Structured Output Parser' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [],
};

describe('CodeBuilderSearchTool', () => {
	describe('builder hints in search results', () => {
		it('should include builder hint for Form Trigger node', async () => {
			const nodeTypeParser = new NodeTypeParser([mockFormTriggerNode, mockFormNode]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['form trigger'] });

			expect(result).toContain('n8n-nodes-base.formTrigger');
			expect(result).toContain('Builder Hint:');
			expect(result).toContain('n8n-nodes-base.form');
			expect(result).toContain('full form experience');
		});

		it('should automatically include related nodes in search results', async () => {
			const nodeTypeParser = new NodeTypeParser([mockRespondToWebhookNode, mockWebhookNode]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			// Search for "respond" which should only match respondToWebhook, not webhook
			const result = await tool.invoke({ queries: ['respond'] });

			// Should include Webhook node as [RELATED] since it's a related node
			expect(result).toContain('[RELATED]');
			expect(result).toContain('n8n-nodes-base.webhook');
			expect(result).toContain('(+ 1 related)');
		});

		it('should include builder hint for Respond to Webhook node', async () => {
			const nodeTypeParser = new NodeTypeParser([mockRespondToWebhookNode, mockWebhookNode]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['respond webhook'] });

			expect(result).toContain('n8n-nodes-base.respondToWebhook');
			expect(result).toContain('Builder Hint:');
			expect(result).toContain('responseMode');
			expect(result).toContain('responseNode');
		});

		it('should include builder hint for Form node', async () => {
			const nodeTypeParser = new NodeTypeParser([mockFormNode, mockFormTriggerNode]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['form'] });

			expect(result).toContain('n8n-nodes-base.form');
			expect(result).toContain('Builder Hint:');
			expect(result).toContain('formTrigger');
		});

		it('should include builder hint for AI Agent node with outputParserStructured', async () => {
			const nodeTypeParser = new NodeTypeParser([mockAgentNode, mockOutputParserStructuredNode]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['agent'] });

			expect(result).toContain('@n8n/n8n-nodes-langchain.agent');
			expect(result).toContain('Builder Hint:');
			expect(result).toContain('outputParserStructured');
			expect(result).toContain('structured JSON output');
		});

		it('should include outputParserStructured as related node when searching for AI Agent only', async () => {
			// Only include Agent node, so outputParserStructured will be added as [RELATED]
			const nodeTypeParser = new NodeTypeParser([mockAgentNode]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['AI Agent'] });

			// Agent should be found
			expect(result).toContain('@n8n/n8n-nodes-langchain.agent');
			expect(result).toContain('Builder Hint:');
			// outputParserStructured is in relatedNodes but not in the nodeTypeParser,
			// so it won't appear as [RELATED] (can't find node info for it)
			// This tests that the hint message itself references the related node
			expect(result).toContain('outputParserStructured');
		});

		it('should show outputParserStructured as [RELATED] when both nodes available but only agent matches search', async () => {
			const nodeTypeParser = new NodeTypeParser([mockAgentNode, mockOutputParserStructuredNode]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			// Search specifically for "AI Agent" - should only match agent node directly
			const result = await tool.invoke({ queries: ['AI Agent'] });

			// Agent should be found directly
			expect(result).toContain('@n8n/n8n-nodes-langchain.agent');
			expect(result).toContain('Builder Hint:');

			// outputParserStructured should appear as [RELATED] since it's in relatedNodes
			// and available in the parser, but doesn't match "AI Agent" search directly
			expect(result).toContain('[RELATED]');
			expect(result).toContain('@n8n/n8n-nodes-langchain.outputParserStructured');
			expect(result).toContain('Structured Output Parser');
			expect(result).toContain('(+ 1 related)');
		});

		it('should recursively collect related nodes (nodeA → nodeB → nodeC)', async () => {
			// Create a chain: nodeA → nodeB → nodeC
			// When searching for nodeA, both nodeB and nodeC should appear as related
			const mockNodeA: INodeTypeDescription = {
				name: 'test.chainA',
				displayName: 'Chain Node A',
				description: 'First node in chain',
				group: ['transform'],
				version: 1,
				defaults: { name: 'Chain Node A' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
				builderHint: {
					message: 'Related to Chain Node B',
					relatedNodes: ['test.chainB'],
				},
			};

			const mockNodeB: INodeTypeDescription = {
				name: 'test.chainB',
				displayName: 'Chain Node B',
				description: 'Second node in chain',
				group: ['transform'],
				version: 1,
				defaults: { name: 'Chain Node B' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
				builderHint: {
					message: 'Related to Chain Node C',
					relatedNodes: ['test.chainC'],
				},
			};

			const mockNodeC: INodeTypeDescription = {
				name: 'test.chainC',
				displayName: 'Chain Node C',
				description: 'Third node in chain',
				group: ['transform'],
				version: 1,
				defaults: { name: 'Chain Node C' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
			};

			const nodeTypeParser = new NodeTypeParser([mockNodeA, mockNodeB, mockNodeC]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			// Search for "Chain Node A" - should only match nodeA directly
			const result = await tool.invoke({ queries: ['Chain Node A'] });

			// Node A should be found directly
			expect(result).toContain('test.chainA');

			// Node B should appear as [RELATED] (direct relation from A)
			expect(result).toContain('test.chainB');
			expect(result).toContain('[RELATED]');

			// Node C should also appear as [RELATED] (indirect relation via B)
			expect(result).toContain('test.chainC');

			// Should show 2 related nodes (B and C)
			expect(result).toContain('(+ 2 related)');
		});

		it('should prevent infinite recursion with circular related nodes', async () => {
			// Create nodes with circular references: A → B → A
			const mockNodeA: INodeTypeDescription = {
				name: 'test.nodeA',
				displayName: 'Node A',
				description: 'Test node A',
				group: ['transform'],
				version: 1,
				defaults: { name: 'Node A' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
				builderHint: {
					message: 'Related to Node B',
					relatedNodes: ['test.nodeB'],
				},
			};

			const mockNodeB: INodeTypeDescription = {
				name: 'test.nodeB',
				displayName: 'Node B',
				description: 'Test node B',
				group: ['transform'],
				version: 1,
				defaults: { name: 'Node B' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
				builderHint: {
					message: 'Related to Node A',
					relatedNodes: ['test.nodeA'],
				},
			};

			const nodeTypeParser = new NodeTypeParser([mockNodeA, mockNodeB]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			// This should not hang or throw due to infinite recursion
			const result = await tool.invoke({ queries: ['Node A'] });

			// Node A should be found
			expect(result).toContain('test.nodeA');

			// Node B should appear as related (only once, not infinitely)
			expect(result).toContain('test.nodeB');
			expect(result).toContain('[RELATED]');
			expect(result).toContain('(+ 1 related)');
		});

		it('should NOT duplicate related nodes if already in search results', async () => {
			const nodeTypeParser = new NodeTypeParser([mockFormTriggerNode, mockFormNode]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			// Search for both nodes - form should match both
			const result = await tool.invoke({ queries: ['form'] });

			// Count occurrences of form node ID
			const formMatches = result.match(/n8n-nodes-base\.form[^T]/g) || [];
			// Should appear once as search result, not duplicated as related
			expect(formMatches.length).toBeLessThanOrEqual(2); // Once in hint text, once as result
		});

		it('should NOT include builder hint for nodes without hints', async () => {
			const nodeTypeParser = new NodeTypeParser([mockHttpRequestNode]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['http'] });

			expect(result).toContain('n8n-nodes-base.httpRequest');
			expect(result).not.toContain('Builder Hint:');
		});
	});

	describe('discriminator information in search results', () => {
		it('should include resource/operation info for nodes with that pattern', async () => {
			const nodeTypeParser = new NodeTypeParser([
				mockFreshserviceNode,
				mockCodeNode,
				mockHttpRequestNode,
			]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['freshservice'] });

			// Should include discriminator section
			expect(result).toContain('Discriminators:');

			// Should show resource info
			expect(result).toContain('resource:');
			expect(result).toContain('ticket');
			expect(result).toContain('agent');

			// Should show operations for each resource
			expect(result).toContain('operations:');
			expect(result).toContain('get');
			expect(result).toContain('create');
			expect(result).toContain('delete');

			// Should include usage hint for get_nodes
			expect(result).toContain('get_nodes');
			expect(result).toContain('resource');
			expect(result).toContain('operation');
		});

		it('should include mode discriminator for Code node', async () => {
			const nodeTypeParser = new NodeTypeParser([
				mockFreshserviceNode,
				mockCodeNode,
				mockHttpRequestNode,
			]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['code'] });

			// Should include discriminator section
			expect(result).toContain('Discriminators:');

			// Should show mode info
			expect(result).toContain('mode:');
			expect(result).toContain('runOnceForAllItems');
			expect(result).toContain('runOnceForEachItem');

			// Should include usage hint
			expect(result).toContain('get_nodes');
			expect(result).toContain('mode');
		});

		it('should NOT include discriminators section for nodes without patterns', async () => {
			const nodeTypeParser = new NodeTypeParser([
				mockFreshserviceNode,
				mockCodeNode,
				mockHttpRequestNode,
			]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['http request'] });

			// HTTP Request node has no discriminators, so no section should appear
			// The result should contain the node but without discriminator info
			expect(result).toContain('n8n-nodes-base.httpRequest');
			expect(result).toContain('HTTP Request');

			// Should NOT have discriminators section for HTTP Request
			// Check that between httpRequest entry and next entry (or end), there's no "Discriminators:"
			const lines = result.split('\n');
			const httpRequestIndex = lines.findIndex((l) => l.includes('n8n-nodes-base.httpRequest'));
			expect(httpRequestIndex).toBeGreaterThan(-1);

			// Find if there's a discriminators line right after the HTTP Request entry
			// (before the next "---" separator or end)
			let hasDiscriminators = false;
			for (let i = httpRequestIndex; i < lines.length; i++) {
				if (lines[i].includes('---') || lines[i].startsWith('##')) break;
				if (lines[i].includes('Discriminators:')) {
					hasDiscriminators = true;
					break;
				}
			}
			expect(hasDiscriminators).toBe(false);
		});

		it('should provide correct usage example in the output', async () => {
			const nodeTypeParser = new NodeTypeParser([mockFreshserviceNode]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['freshservice'] });

			// Should show how to call get_nodes with discriminators
			expect(result).toMatch(/get_nodes.*nodeId.*freshservice.*resource.*operation/s);
		});
	});

	describe('createCodeBuilderSearchTool', () => {
		it('should create tool with correct name', () => {
			const nodeTypeParser = new NodeTypeParser([mockHttpRequestNode]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);
			expect(tool.name).toBe('search_nodes');
		});

		it('should return results for multiple queries', async () => {
			const nodeTypeParser = new NodeTypeParser([
				mockFreshserviceNode,
				mockCodeNode,
				mockHttpRequestNode,
			]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['freshservice', 'code'] });

			// Should contain results for both queries
			expect(result).toContain('"freshservice"');
			expect(result).toContain('"code"');
			expect(result).toContain('Freshservice');
			expect(result).toContain('Code');
		});

		it('should handle queries with no results', async () => {
			const nodeTypeParser = new NodeTypeParser([mockHttpRequestNode]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['nonexistent-node-xyz'] });

			expect(result).toContain('No nodes found');
			expect(result).toContain('Try a different search term');
		});
	});

	describe('mode discriminator with outputConnectionType and SDK function mapping', () => {
		it('should show display name and SDK function for modes with outputConnectionType', async () => {
			const nodeTypeParser = new NodeTypeParser([mockVectorStoreNode]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['pinecone'] });

			// Should include discriminator section
			expect(result).toContain('Discriminators:');
			expect(result).toContain('mode:');

			// Should show mode values with display names
			expect(result).toContain('retrieve');
			expect(result).toContain('retrieve-as-tool');

			// Should show display names
			expect(result).toContain('Retrieve Documents (As Vector Store for Chain/Tool)');
			expect(result).toContain('Retrieve Documents (As Tool for AI Agent)');

			// Should show SDK function mapping for modes with outputConnectionType
			// retrieve → vectorStore() for subnodes.vectorStore
			expect(result).toMatch(/retrieve.*vectorStore\(\)/s);

			// retrieve-as-tool → tool() for subnodes.tools
			expect(result).toMatch(/retrieve-as-tool.*tool\(\)/s);
		});

		it('should show node() for modes without outputConnectionType', async () => {
			const nodeTypeParser = new NodeTypeParser([mockVectorStoreNode]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['pinecone'] });

			// Modes without outputConnectionType should be shown as standalone
			expect(result).toContain('load');
			expect(result).toContain('Get Many');
			expect(result).toContain('insert');
			expect(result).toContain('Insert Documents');
			expect(result).toContain('update');
			expect(result).toContain('Update Documents');

			// These should indicate they use node() function
			expect(result).toMatch(/load.*Get Many.*node\(\)/is);
		});

		it('should NOT show SDK function for nodes where all modes use node()', async () => {
			const nodeTypeParser = new NodeTypeParser([mockCodeNode]);
			const tool = createCodeBuilderSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['code'] });

			// Should show mode values with display names
			expect(result).toContain('runOnceForAllItems');
			expect(result).toContain('Run Once for All Items');
			expect(result).toContain('runOnceForEachItem');
			expect(result).toContain('Run Once for Each Item');

			// Code node modes all use node(), so should NOT show SDK function mapping
			expect(result).not.toContain('node()');
			expect(result).not.toContain('→ use');
		});
	});
});
