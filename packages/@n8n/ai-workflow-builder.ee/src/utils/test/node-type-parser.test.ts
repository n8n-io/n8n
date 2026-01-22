import type { INodeTypeDescription } from 'n8n-workflow';
import { NodeTypeParser } from '../node-type-parser';

// Mock node with resource/operation pattern (like Freshservice)
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
				{ name: 'List', value: 'list', description: 'List agents' },
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

// Mock trigger node
const mockManualTriggerNode: INodeTypeDescription = {
	name: 'n8n-nodes-base.manualTrigger',
	displayName: 'Manual Trigger',
	description: 'Starts the workflow on clicking a button in n8n',
	group: ['trigger'],
	version: 1,
	defaults: { name: 'When clicking Test workflow' },
	inputs: [],
	outputs: ['main'],
	properties: [],
};

// Mock AI node
const mockAgentNode: INodeTypeDescription = {
	name: '@n8n/n8n-nodes-langchain.agent',
	displayName: 'AI Agent',
	description: 'AI Agent that can use tools',
	group: ['transform'],
	version: 1,
	defaults: { name: 'AI Agent' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [],
};

describe('NodeTypeParser', () => {
	describe('getNodeIdsByCategoryWithDiscriminators', () => {
		it('should return nodes grouped by category with discriminator info', () => {
			const parser = new NodeTypeParser([
				mockFreshserviceNode,
				mockCodeNode,
				mockHttpRequestNode,
				mockManualTriggerNode,
				mockAgentNode,
			]);

			const result = parser.getNodeIdsByCategoryWithDiscriminators();

			// Check structure exists
			expect(result).toHaveProperty('triggers');
			expect(result).toHaveProperty('core');
			expect(result).toHaveProperty('ai');
			expect(result).toHaveProperty('other');

			// Check triggers include manual trigger
			expect(result.triggers.some((n) => n.id === 'n8n-nodes-base.manualTrigger')).toBe(true);

			// Check core includes httpRequest and code
			expect(result.core.some((n) => n.id === 'n8n-nodes-base.httpRequest')).toBe(true);
			expect(result.core.some((n) => n.id === 'n8n-nodes-base.code')).toBe(true);

			// Check AI includes agent
			expect(result.ai.some((n) => n.id === '@n8n/n8n-nodes-langchain.agent')).toBe(true);

			// Check other includes freshservice
			expect(result.other.some((n) => n.id === 'n8n-nodes-base.freshservice')).toBe(true);
		});

		it('should include resource/operation discriminators for nodes with that pattern', () => {
			const parser = new NodeTypeParser([mockFreshserviceNode, mockHttpRequestNode]);

			const result = parser.getNodeIdsByCategoryWithDiscriminators();

			// Find freshservice in results
			const freshservice = result.other.find((n) => n.id === 'n8n-nodes-base.freshservice');
			expect(freshservice).toBeDefined();
			expect(freshservice?.discriminators).toBeDefined();
			expect(freshservice?.discriminators?.type).toBe('resource_operation');
			expect(freshservice?.discriminators?.resources).toBeDefined();
			expect(freshservice?.discriminators?.resources?.length).toBeGreaterThan(0);

			// Check resources contain ticket and agent
			const resourceValues = freshservice?.discriminators?.resources?.map((r) => r.value);
			expect(resourceValues).toContain('ticket');
			expect(resourceValues).toContain('agent');

			// Check operations for ticket
			const ticketResource = freshservice?.discriminators?.resources?.find(
				(r) => r.value === 'ticket',
			);
			expect(ticketResource?.operations).toContain('get');
			expect(ticketResource?.operations).toContain('create');
		});

		it('should include mode discriminators for nodes with that pattern', () => {
			const parser = new NodeTypeParser([mockCodeNode, mockHttpRequestNode]);

			const result = parser.getNodeIdsByCategoryWithDiscriminators();

			// Find code in results (should be in core)
			const code = result.core.find((n) => n.id === 'n8n-nodes-base.code');
			expect(code).toBeDefined();
			expect(code?.discriminators).toBeDefined();
			expect(code?.discriminators?.type).toBe('mode');
			expect(code?.discriminators?.modes).toBeDefined();
			expect(code?.discriminators?.modes).toContain('runOnceForAllItems');
			expect(code?.discriminators?.modes).toContain('runOnceForEachItem');
		});

		it('should have no discriminators for nodes without patterns', () => {
			const parser = new NodeTypeParser([mockHttpRequestNode]);

			const result = parser.getNodeIdsByCategoryWithDiscriminators();

			// Find httpRequest in results
			const httpRequest = result.core.find((n) => n.id === 'n8n-nodes-base.httpRequest');
			expect(httpRequest).toBeDefined();
			expect(httpRequest?.discriminators).toBeUndefined();
		});

		it('should have no discriminators for trigger nodes', () => {
			const parser = new NodeTypeParser([mockManualTriggerNode]);

			const result = parser.getNodeIdsByCategoryWithDiscriminators();

			// Find trigger in results
			const trigger = result.triggers.find((n) => n.id === 'n8n-nodes-base.manualTrigger');
			expect(trigger).toBeDefined();
			expect(trigger?.discriminators).toBeUndefined();
		});
	});
});
