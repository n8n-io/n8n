import type { INodeTypeDescription } from 'n8n-workflow';

import { NodeTypeParser } from '../../utils/node-type-parser';
import { createGetSuggestedNodesTool } from '../get-suggested-nodes.tool';
import { categoryList, suggestedNodesData } from '../suggested-nodes-data';

// Mock node types that match some suggested nodes
const mockSlackNode: INodeTypeDescription = {
	name: 'n8n-nodes-base.slack',
	displayName: 'Slack',
	description: 'Send messages to Slack channels',
	group: ['output'],
	version: 2,
	defaults: { name: 'Slack' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [],
};

const mockDataTableNode: INodeTypeDescription = {
	name: 'n8n-nodes-base.dataTable',
	displayName: 'Data Table',
	description: 'Store and query data in n8n',
	group: ['transform'],
	version: 1,
	defaults: { name: 'Data Table' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [],
};

const mockAgentNode: INodeTypeDescription = {
	name: '@n8n/n8n-nodes-langchain.agent',
	displayName: 'AI Agent',
	description: 'Generates an action plan and executes it',
	group: ['transform'],
	version: 3.1,
	defaults: { name: 'AI Agent' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [],
};

const mockMemoryNode: INodeTypeDescription = {
	name: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
	displayName: 'Window Buffer Memory',
	description: 'Stores conversation history in memory',
	group: ['transform'],
	version: 1.3,
	defaults: { name: 'Window Buffer Memory' },
	inputs: ['main'],
	outputs: ['main'],
	properties: [],
};

describe('GetSuggestedNodesTool', () => {
	describe('createGetSuggestedNodesTool', () => {
		it('should create tool with correct name', () => {
			const nodeTypeParser = new NodeTypeParser([]);
			const tool = createGetSuggestedNodesTool(nodeTypeParser);

			expect(tool.name).toBe('get_suggested_nodes');
		});
	});

	describe('single category', () => {
		it('should return nodes for chatbot category', async () => {
			const nodeTypeParser = new NodeTypeParser([mockAgentNode, mockMemoryNode, mockSlackNode]);
			const tool = createGetSuggestedNodesTool(nodeTypeParser);

			const result = await tool.invoke({ categories: ['chatbot'] });

			expect(result).toContain('chatbot');
			expect(result).toContain('patternHint');
			expect(result).toContain('Chat Trigger → AI Agent → Memory → Response');
			expect(result).toContain('@n8n/n8n-nodes-langchain.agent');
		});

		it('should return nodes for data_persistence category', async () => {
			const nodeTypeParser = new NodeTypeParser([mockDataTableNode]);
			const tool = createGetSuggestedNodesTool(nodeTypeParser);

			const result = await tool.invoke({ categories: ['data_persistence'] });

			expect(result).toContain('data_persistence');
			expect(result).toContain('n8n-nodes-base.dataTable');
			expect(result).toContain('PREFERRED - no external config needed');
		});
	});

	describe('multiple categories', () => {
		it('should return nodes for multiple categories', async () => {
			const nodeTypeParser = new NodeTypeParser([mockAgentNode, mockDataTableNode, mockSlackNode]);
			const tool = createGetSuggestedNodesTool(nodeTypeParser);

			const result = await tool.invoke({ categories: ['chatbot', 'notification'] });

			expect(result).toContain('chatbot');
			expect(result).toContain('notification');
			expect(result).toContain('@n8n/n8n-nodes-langchain.agent');
			expect(result).toContain('n8n-nodes-base.slack');
		});
	});

	describe('node descriptions from parser', () => {
		it('should include node description from nodeTypeParser', async () => {
			const nodeTypeParser = new NodeTypeParser([mockAgentNode]);
			const tool = createGetSuggestedNodesTool(nodeTypeParser);

			const result = await tool.invoke({ categories: ['chatbot'] });

			expect(result).toContain('AI Agent');
			expect(result).toContain('Generates an action plan and executes it');
		});

		it('should indicate when node is not found in parser', async () => {
			// Empty parser - no nodes available
			const nodeTypeParser = new NodeTypeParser([]);
			const tool = createGetSuggestedNodesTool(nodeTypeParser);

			const result = await tool.invoke({ categories: ['chatbot'] });

			// Should still list the node but indicate it's not found
			expect(result).toContain('@n8n/n8n-nodes-langchain.chatTrigger');
			expect(result).toContain('(not found)');
		});
	});

	describe('notes for nodes', () => {
		it('should include notes when present', async () => {
			const nodeTypeParser = new NodeTypeParser([mockAgentNode]);
			const tool = createGetSuggestedNodesTool(nodeTypeParser);

			const result = await tool.invoke({ categories: ['chatbot'] });

			// Agent has note about memory subnode requirement
			expect(result).toContain(
				'Every agent in a conversational workflow MUST have a memory subnode connected',
			);
		});

		it('should not include note marker when no note', async () => {
			// lmChatOpenAi has no note in chatbot category
			const mockLmChatOpenAi: INodeTypeDescription = {
				name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				displayName: 'OpenAI Chat Model',
				description: 'Use OpenAI Chat models',
				group: ['transform'],
				version: 1,
				defaults: { name: 'OpenAI Chat Model' },
				inputs: ['main'],
				outputs: ['main'],
				properties: [],
			};
			const nodeTypeParser = new NodeTypeParser([mockLmChatOpenAi]);
			const tool = createGetSuggestedNodesTool(nodeTypeParser);

			const result = await tool.invoke({ categories: ['chatbot'] });

			// lmChatOpenAi should be there
			expect(result).toContain('@n8n/n8n-nodes-langchain.lmChatOpenAi');
			// And have description
			expect(result).toContain('Use OpenAI Chat models');
		});
	});

	describe('invalid categories', () => {
		it('should handle unknown category gracefully', async () => {
			const nodeTypeParser = new NodeTypeParser([]);
			const tool = createGetSuggestedNodesTool(nodeTypeParser);

			const result = await tool.invoke({ categories: ['unknown_category'] });

			expect(result).toContain('unknown_category');
			expect(result).toContain('not found');
		});
	});

	describe('category data validation', () => {
		it('should have all 11 expected categories', () => {
			expect(categoryList).toHaveLength(11);
			expect(categoryList).toContain('chatbot');
			expect(categoryList).toContain('notification');
			expect(categoryList).toContain('scheduling');
			expect(categoryList).toContain('data_transformation');
			expect(categoryList).toContain('data_persistence');
			expect(categoryList).toContain('data_extraction');
			expect(categoryList).toContain('document_processing');
			expect(categoryList).toContain('form_input');
			expect(categoryList).toContain('content_generation');
			expect(categoryList).toContain('triage');
			expect(categoryList).toContain('scraping_and_research');
		});

		it('each category should have description, patternHint, and nodes', () => {
			for (const category of categoryList) {
				const data = suggestedNodesData[category];
				expect(data.description).toBeDefined();
				expect(data.description.length).toBeGreaterThan(0);
				expect(data.patternHint).toBeDefined();
				expect(data.patternHint.length).toBeGreaterThan(0);
				expect(data.nodes).toBeDefined();
				expect(data.nodes.length).toBeGreaterThan(0);
			}
		});
	});
});
