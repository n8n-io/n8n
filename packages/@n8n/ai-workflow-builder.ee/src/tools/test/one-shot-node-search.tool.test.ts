import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeTypeParser } from '../../utils/node-type-parser';
import { createOneShotNodeSearchTool } from '../one-shot-node-search.tool';

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

describe('OneShotNodeSearchTool', () => {
	describe('discriminator information in search results', () => {
		it('should include resource/operation info for nodes with that pattern', async () => {
			const nodeTypeParser = new NodeTypeParser([
				mockFreshserviceNode,
				mockCodeNode,
				mockHttpRequestNode,
			]);
			const tool = createOneShotNodeSearchTool(nodeTypeParser);

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
			const tool = createOneShotNodeSearchTool(nodeTypeParser);

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
			const tool = createOneShotNodeSearchTool(nodeTypeParser);

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
			const tool = createOneShotNodeSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['freshservice'] });

			// Should show how to call get_nodes with discriminators
			expect(result).toMatch(/get_nodes.*nodeId.*freshservice.*resource.*operation/s);
		});
	});

	describe('createOneShotNodeSearchTool', () => {
		it('should create tool with correct name', () => {
			const nodeTypeParser = new NodeTypeParser([mockHttpRequestNode]);
			const tool = createOneShotNodeSearchTool(nodeTypeParser);
			expect(tool.name).toBe('search_nodes');
		});

		it('should return results for multiple queries', async () => {
			const nodeTypeParser = new NodeTypeParser([
				mockFreshserviceNode,
				mockCodeNode,
				mockHttpRequestNode,
			]);
			const tool = createOneShotNodeSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['freshservice', 'code'] });

			// Should contain results for both queries
			expect(result).toContain('"freshservice"');
			expect(result).toContain('"code"');
			expect(result).toContain('Freshservice');
			expect(result).toContain('Code');
		});

		it('should handle queries with no results', async () => {
			const nodeTypeParser = new NodeTypeParser([mockHttpRequestNode]);
			const tool = createOneShotNodeSearchTool(nodeTypeParser);

			const result = await tool.invoke({ queries: ['nonexistent-node-xyz'] });

			expect(result).toContain('No nodes found');
			expect(result).toContain('Try a different search term');
		});
	});
});
