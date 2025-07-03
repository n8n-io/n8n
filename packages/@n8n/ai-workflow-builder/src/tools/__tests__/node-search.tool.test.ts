import { NodeConnectionTypes } from 'n8n-workflow';

import { NodeSearchEngine, type NodeSearchResult } from '../engines/node-search-engine';
import { createNodeSearchTool } from '../node-search.tool';
import { getAllTestNodeTypes } from '../test-utils';

describe('NodeSearchTool', () => {
	let tool: ReturnType<typeof createNodeSearchTool>;
	let mockWriter: jest.Mock;
	let mockConfig: any;
	let writtenMessages: any[] = [];

	beforeEach(() => {
		writtenMessages = [];
		mockWriter = jest.fn((message) => {
			writtenMessages.push(message);
		});
		mockConfig = {
			writer: mockWriter,
			toolCall: { id: 'test-id' },
		};
		tool = createNodeSearchTool(getAllTestNodeTypes());
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('Name-based search', () => {
		it('should find nodes by exact name match', async () => {
			await tool.invoke(
				{
					queries: [
						{
							queryType: 'name',
							query: 'HTTP Request',
						},
					],
				},
				mockConfig,
			);

			// Check progress messages
			const progressMessages = writtenMessages.filter(
				(msg) => msg.type === 'tool' && msg.status === 'running',
			);
			expect(progressMessages.length).toBeGreaterThan(0);

			// Check completion
			const completedMessages = writtenMessages.filter(
				(msg) => msg.type === 'tool' && msg.status === 'completed',
			);
			expect(completedMessages.length).toBe(1);

			// Check output
			const output = completedMessages[0].updates.find((u: any) => u.type === 'output');
			expect(output).toBeDefined();
			expect(output.data.results[0].results.length).toBeGreaterThan(0);
			expect(output.data.results[0].results[0].displayName).toBe('HTTP Request');
		});

		it('should find nodes by partial name match', async () => {
			await tool.invoke(
				{
					queries: [
						{
							queryType: 'name',
							query: 'http',
						},
					],
				},
				mockConfig,
			);

			const completedMessages = writtenMessages.filter(
				(msg) => msg.type === 'tool' && msg.status === 'completed',
			);
			const output = completedMessages[0].updates.find((u: any) => u.type === 'output');
			const results = output.data.results[0].results;
			expect(results.some((r: any) => r.name.includes('http'))).toBe(true);
		});

		it('should handle no results gracefully', async () => {
			await tool.invoke(
				{
					queries: [
						{
							queryType: 'name',
							query: 'NonExistentNode',
						},
					],
				},
				mockConfig,
			);

			const completedMessages = writtenMessages.filter(
				(msg) => msg.type === 'tool' && msg.status === 'completed',
			);
			const output = completedMessages[0].updates.find((u: any) => u.type === 'output');
			expect(output.data.results[0].results.length).toBe(0);
		});
	});

	describe('Sub-node search by connection type', () => {
		it('should find AI tools', async () => {
			await tool.invoke(
				{
					queries: [
						{
							queryType: 'subNodeSearch',
							connectionType: NodeConnectionTypes.AiTool,
						},
					],
				},
				mockConfig,
			);

			const completedMessages = writtenMessages.filter(
				(msg) => msg.type === 'tool' && msg.status === 'completed',
			);
			const output = completedMessages[0].updates.find((u: any) => u.type === 'output');
			const results = output.data.results[0].results;
			expect(results.length).toBe(2); // Calculator and Code tools
			expect(results.every((r: any) => r.name.includes('tool'))).toBe(true);
		});

		it('should filter sub-nodes by name', async () => {
			await tool.invoke(
				{
					queries: [
						{
							queryType: 'subNodeSearch',
							connectionType: NodeConnectionTypes.AiTool,
							query: 'calculator',
						},
					],
				},
				mockConfig,
			);

			const completedMessages = writtenMessages.filter(
				(msg) => msg.type === 'tool' && msg.status === 'completed',
			);
			const output = completedMessages[0].updates.find((u: any) => u.type === 'output');
			const results = output.data.results[0].results;
			expect(results.length).toBe(1);
			expect(results[0].name).toBe('@n8n/n8n-nodes-langchain.toolCalculator');
		});
	});

	describe('Multiple queries', () => {
		it('should process multiple queries in one request', async () => {
			await tool.invoke(
				{
					queries: [
						{
							queryType: 'name',
							query: 'http',
						},
						{
							queryType: 'subNodeSearch',
							connectionType: NodeConnectionTypes.AiTool,
						},
						{
							queryType: 'name',
							query: 'set',
						},
					],
				},
				mockConfig,
			);

			const completedMessages = writtenMessages.filter(
				(msg) => msg.type === 'tool' && msg.status === 'completed',
			);
			const output = completedMessages[0].updates.find((u: any) => u.type === 'output');

			expect(output.data.results.length).toBe(3);
			expect(output.data.totalResults).toBeGreaterThan(0);
			expect(output.data.results[0].query).toBe('http');
			expect(output.data.results[1].query).toContain('ai_tool');
			expect(output.data.results[2].query).toBe('set');
		});
	});

	describe('Progress reporting', () => {
		it('should report batch progress correctly', async () => {
			await tool.invoke(
				{
					queries: [
						{ queryType: 'name', query: 'test1' },
						{ queryType: 'name', query: 'test2' },
						{ queryType: 'name', query: 'test3' },
					],
				},
				mockConfig,
			);

			const progressMessages = writtenMessages
				.filter((msg) => msg.type === 'tool' && msg.status === 'running')
				.flatMap((msg) => msg.updates)
				.filter((u) => u.type === 'progress')
				.map((u) => u.data);

			expect(progressMessages.some((msg) => msg.includes('Processing item 1 of 3'))).toBe(true);
			expect(progressMessages.some((msg) => msg.includes('Processing item 2 of 3'))).toBe(true);
			expect(progressMessages.some((msg) => msg.includes('Processing item 3 of 3'))).toBe(true);
			expect(progressMessages.some((msg) => msg.includes('Completed all 3 items'))).toBe(true);
		});
	});
});

describe('NodeSearchEngine', () => {
	const engine = new NodeSearchEngine(getAllTestNodeTypes());

	describe('searchByName', () => {
		it('should score exact matches highest', () => {
			const results = engine.searchByName('HTTP Request', 10);
			expect(results[0].displayName).toBe('HTTP Request');
			expect(results[0].score).toBeGreaterThan(20); // Should include exact match bonus
		});

		it('should find nodes by partial match', () => {
			const results = engine.searchByName('req', 10);
			const httpNode = results.find((r) => r.name === 'n8n-nodes-base.httpRequest');
			expect(httpNode).toBeDefined();
		});

		it('should be case insensitive', () => {
			const results1 = engine.searchByName('http', 10);
			const results2 = engine.searchByName('HTTP', 10);
			expect(results1.length).toBe(results2.length);
		});

		it('should limit results', () => {
			const results = engine.searchByName('a', 2); // Match many nodes
			expect(results.length).toBeLessThanOrEqual(2);
		});
	});

	describe('searchByConnectionType', () => {
		it('should find all nodes outputting specific connection type', () => {
			const results = engine.searchByConnectionType(NodeConnectionTypes.AiTool, 10);
			expect(results.every((r) => r.name.includes('tool'))).toBe(true);
		});

		it('should filter by name when provided', () => {
			const results = engine.searchByConnectionType(
				NodeConnectionTypes.AiLanguageModel,
				10,
				'openai',
			);
			expect(results.length).toBe(1);
			expect(results[0].name).toContain('OpenAi');
		});
	});

	describe('formatResult', () => {
		it('should format result as XML', () => {
			const result: NodeSearchResult = {
				name: 'test.node',
				displayName: 'Test Node',
				description: 'A test node',
				score: 100,
				inputs: ['main'] as any, // Type assertion needed due to INodeTypeDescription type complexity
				outputs: ['main'] as any,
			};

			const formatted = engine.formatResult(result);
			expect(formatted).toContain('<node>');
			expect(formatted).toContain('<node_name>test.node</node_name>');
			expect(formatted).toContain('<node_display_name>Test Node</node_display_name>');
			expect(formatted).toContain('</node>');
		});
	});

	describe('static methods', () => {
		it('should identify AI connection types', () => {
			expect(NodeSearchEngine.isAiConnectionType('ai_tool')).toBe(true);
			expect(NodeSearchEngine.isAiConnectionType('ai_languageModel')).toBe(true);
			expect(NodeSearchEngine.isAiConnectionType('main')).toBe(false);
		});

		it('should get all AI connection types', () => {
			const aiTypes = NodeSearchEngine.getAiConnectionTypes();
			expect(aiTypes.every((type) => type.startsWith('ai_'))).toBe(true);
			expect(aiTypes).toContain(NodeConnectionTypes.AiTool);
			expect(aiTypes).toContain(NodeConnectionTypes.AiLanguageModel);
		});
	});
});
