import {
	NodeConnectionTypes,
	type INodeTypeDescription,
	type NodeConnectionType,
} from 'n8n-workflow';

import { createNodeType } from '../../../../test/test-utils';
import { NodeSearchEngine, SCORE_WEIGHTS } from '../node-search-engine';

describe('NodeSearchEngine', () => {
	let searchEngine: NodeSearchEngine;
	let nodeTypes: INodeTypeDescription[];

	beforeEach(() => {
		// Create a diverse set of test node types
		nodeTypes = [
			createNodeType({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
				description: 'Makes HTTP requests to external services',
				group: ['input'],
			}),
			createNodeType({
				name: 'n8n-nodes-base.code',
				displayName: 'Code',
				description: 'Run custom JavaScript code',
				group: ['transform'],
			}),
			createNodeType({
				name: 'n8n-nodes-base.webhook',
				displayName: 'Webhook',
				description: 'Starts workflow on webhook call',
				group: ['trigger'],
				inputs: [],
				outputs: ['main'],
			}),
			createNodeType({
				name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				displayName: 'OpenAI Chat Model',
				description: 'Language model from OpenAI',
				group: ['output'],
				inputs: [],
				outputs: ['ai_languageModel'],
			}),
			createNodeType({
				name: '@n8n/n8n-nodes-langchain.toolCalculator',
				displayName: 'Calculator Tool',
				description: 'Perform mathematical calculations',
				group: ['output'],
				inputs: [],
				outputs: ['ai_tool'],
			}),
			createNodeType({
				name: '@n8n/n8n-nodes-langchain.vectorStoreMemory',
				displayName: 'Vector Store Memory',
				description: 'Store and retrieve embeddings',
				group: ['output'],
				inputs: [],
				outputs: ['ai_memory'],
			}),
			createNodeType({
				name: 'n8n-nodes-base.httpBin',
				displayName: 'HTTP Bin',
				description: 'Test HTTP requests with httpbin.org',
				group: ['input'],
				codex: {
					alias: ['httpbin', 'request bin'],
				},
			}),
		];

		searchEngine = new NodeSearchEngine(nodeTypes);
	});

	describe('searchByName', () => {
		it('should find nodes by exact name match', () => {
			const results = searchEngine.searchByName('Code');

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('n8n-nodes-base.code');
			expect(results[0].displayName).toBe('Code');
			// Should have display name exact match, display name contains, name contains (code is in the name),
			// and description contains ("Run custom JavaScript code")
			const expectedScore =
				SCORE_WEIGHTS.DISPLAY_NAME_EXACT +
				SCORE_WEIGHTS.DISPLAY_NAME_CONTAINS +
				SCORE_WEIGHTS.NAME_CONTAINS +
				SCORE_WEIGHTS.DESCRIPTION_CONTAINS;
			expect(results[0].score).toBe(expectedScore);
		});

		it('should find nodes by partial name match', () => {
			const results = searchEngine.searchByName('http');

			expect(results.length).toBe(2);
			const httpRequestNode = results.find((r) => r.name === 'n8n-nodes-base.httpRequest');
			const httpBinNode = results.find((r) => r.name === 'n8n-nodes-base.httpBin');
			expect(httpRequestNode).toBeDefined();
			expect(httpBinNode).toBeDefined();
		});

		it('should find nodes by description match', () => {
			const results = searchEngine.searchByName('javascript');

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('n8n-nodes-base.code');
			expect(results[0].score).toBe(SCORE_WEIGHTS.DESCRIPTION_CONTAINS);
		});

		it('should find nodes by alias match', () => {
			const results = searchEngine.searchByName('httpbin');

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('n8n-nodes-base.httpBin');
			expect(results[0].score).toBeGreaterThanOrEqual(SCORE_WEIGHTS.ALIAS_CONTAINS);
		});

		it('should handle case-insensitive search', () => {
			const resultsLower = searchEngine.searchByName('webhook');
			const resultsUpper = searchEngine.searchByName('WEBHOOK');
			const resultsMixed = searchEngine.searchByName('WebHook');

			expect(resultsLower).toHaveLength(1);
			expect(resultsUpper).toHaveLength(1);
			expect(resultsMixed).toHaveLength(1);
			expect(resultsLower[0].name).toBe(resultsUpper[0].name);
			expect(resultsLower[0].name).toBe(resultsMixed[0].name);
		});

		it('should return empty array for no matches', () => {
			const results = searchEngine.searchByName('nonexistent');

			expect(results).toEqual([]);
		});

		it('should respect limit parameter', () => {
			const results = searchEngine.searchByName('a', 2);

			expect(results.length).toBeLessThanOrEqual(2);
		});

		it('should combine scores for multiple matches', () => {
			const results = searchEngine.searchByName('request');

			// HTTP Request should have highest score (name + display name + description)
			expect(results[0].name).toBe('n8n-nodes-base.httpRequest');
			expect(results[0].score).toBe(
				SCORE_WEIGHTS.NAME_CONTAINS +
					SCORE_WEIGHTS.DISPLAY_NAME_CONTAINS +
					SCORE_WEIGHTS.DESCRIPTION_CONTAINS,
			);
		});

		it('should handle nodes without description', () => {
			const nodeWithoutDesc = createNodeType({
				name: 'test.node',
				displayName: 'Test Node',
				description: undefined,
			});
			const engine = new NodeSearchEngine([nodeWithoutDesc]);

			const results = engine.searchByName('test');

			expect(results).toHaveLength(1);
			expect(results[0].description).toBe('No description available');
		});

		it('should handle malformed node types gracefully', () => {
			// Add a node that might cause errors
			const malformedNode = {
				name: null as unknown as string,
				displayName: undefined as unknown as string,
			} as INodeTypeDescription;

			const engineWithMalformed = new NodeSearchEngine([...nodeTypes, malformedNode]);

			// Should not throw and should return valid results
			expect(() => engineWithMalformed.searchByName('http')).not.toThrow();
			const results = engineWithMalformed.searchByName('http');
			expect(results.length).toBeGreaterThan(0);
		});
	});

	describe('searchByConnectionType', () => {
		it('should find nodes with exact connection type match', () => {
			const results = searchEngine.searchByConnectionType(NodeConnectionTypes.AiTool);

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('@n8n/n8n-nodes-langchain.toolCalculator');
			expect(results[0].score).toBe(SCORE_WEIGHTS.CONNECTION_EXACT);
		});

		it('should find multiple nodes with same connection type', () => {
			// Add another AI tool node
			const anotherTool = createNodeType({
				name: '@n8n/n8n-nodes-langchain.toolCode',
				displayName: 'Code Tool',
				outputs: ['ai_tool'],
			});
			const engine = new NodeSearchEngine([...nodeTypes, anotherTool]);

			const results = engine.searchByConnectionType(NodeConnectionTypes.AiTool);

			expect(results).toHaveLength(2);
			expect(results.map((r) => r.name)).toContain('@n8n/n8n-nodes-langchain.toolCalculator');
			expect(results.map((r) => r.name)).toContain('@n8n/n8n-nodes-langchain.toolCode');
		});

		it('should apply name filter when provided', () => {
			const results = searchEngine.searchByConnectionType(
				NodeConnectionTypes.AiLanguageModel,
				20,
				'openai',
			);

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('@n8n/n8n-nodes-langchain.lmChatOpenAi');
		});

		it('should exclude nodes that do not match name filter', () => {
			const results = searchEngine.searchByConnectionType(
				NodeConnectionTypes.AiLanguageModel,
				20,
				'anthropic',
			);

			expect(results).toHaveLength(0);
		});

		it('should handle expression-based outputs', () => {
			const expressionNode = createNodeType({
				name: 'test.expression',
				displayName: 'Expression Node',
				outputs: '={{ $parameter.mode === "tool" ? "ai_tool" : "main" }}',
			});
			const engine = new NodeSearchEngine([...nodeTypes, expressionNode]);

			const results = engine.searchByConnectionType(NodeConnectionTypes.AiTool);

			// Should find the expression node with lower score
			const expressionResult = results.find((r) => r.name === 'test.expression');
			expect(expressionResult).toBeDefined();
			expect(expressionResult!.score).toBe(SCORE_WEIGHTS.CONNECTION_IN_EXPRESSION);
		});

		it('should sort by score with name filter boost', () => {
			// Add nodes with different match qualities
			const exactMatch = createNodeType({
				name: 'test.exact',
				displayName: 'Calculator Exact',
				outputs: ['ai_tool'],
			});
			const expressionMatch = createNodeType({
				name: 'test.expression',
				displayName: 'Something Else',
				outputs: '={{ "ai_tool" }}',
			});
			const engine = new NodeSearchEngine([...nodeTypes, exactMatch, expressionMatch]);

			const results = engine.searchByConnectionType(NodeConnectionTypes.AiTool, 20, 'calculator');

			// Both Calculator nodes should appear (both have 'calculator' in name)
			// Expression match should not appear (no name match)
			const names = results.map((r) => r.name);
			expect(names).toContain('test.exact');
			expect(names).toContain('@n8n/n8n-nodes-langchain.toolCalculator');
			expect(results.find((r) => r.name === 'test.expression')).toBeUndefined();

			// Both should have same score (exact connection + name match)
			const exactScore = results.find((r) => r.name === 'test.exact')?.score;
			const calculatorScore = results.find(
				(r) => r.name === '@n8n/n8n-nodes-langchain.toolCalculator',
			)?.score;
			expect(exactScore).toBeDefined();
			expect(calculatorScore).toBeDefined();
			expect(exactScore).toBeGreaterThan(0);
			expect(calculatorScore).toBeGreaterThan(0);
		});

		it('should return empty array for non-existent connection type', () => {
			const results = searchEngine.searchByConnectionType('ai_nonexistent' as NodeConnectionType);

			expect(results).toEqual([]);
		});

		it('should respect limit parameter', () => {
			// Add many nodes with same connection type
			const manyNodes = Array.from({ length: 10 }, (_, i) =>
				createNodeType({
					name: `test.tool${i}`,
					displayName: `Tool ${i}`,
					outputs: ['ai_tool'],
				}),
			);
			const engine = new NodeSearchEngine([...nodeTypes, ...manyNodes]);

			const results = engine.searchByConnectionType(NodeConnectionTypes.AiTool, 5);

			expect(results).toHaveLength(5);
		});
	});

	describe('formatResult', () => {
		it('should format search result as XML', () => {
			const result = {
				name: 'test.node',
				displayName: 'Test Node',
				description: 'Test description',
				inputs: ['main'] as NodeConnectionType[],
				outputs: ['main'] as NodeConnectionType[],
				score: 100,
			};

			const formatted = searchEngine.formatResult(result);

			expect(formatted).toContain('<node>');
			expect(formatted).toContain('<node_name>test.node</node_name>');
			expect(formatted).toContain('<node_description>Test description</node_description>');
			expect(formatted).toContain('</node>');
		});

		it('should handle array inputs/outputs', () => {
			const result = {
				name: 'test.node',
				displayName: 'Test Node',
				description: 'Test',
				inputs: ['main', 'ai_tool'] as NodeConnectionType[],
				outputs: ['main', 'main'] as NodeConnectionType[],
				score: 50,
			};

			const formatted = searchEngine.formatResult(result);

			expect(formatted).toContain('<node_inputs>["main","ai_tool"]</node_inputs>');
			expect(formatted).toContain('<node_outputs>["main","main"]</node_outputs>');
		});

		it('should handle string inputs/outputs', () => {
			const result = {
				name: 'test.node',
				displayName: 'Test Node',
				description: 'Test',
				inputs: '={{ $parameter.inputs }}' as `={{${string}}}`,
				outputs: '={{ $parameter.outputs }}' as `={{${string}}}`,
				score: 50,
			};

			const formatted = searchEngine.formatResult(result);

			expect(formatted).toContain('<node_inputs>={{ $parameter.inputs }}</node_inputs>');
			expect(formatted).toContain('<node_outputs>={{ $parameter.outputs }}</node_outputs>');
		});

		it('should handle complex object inputs/outputs', () => {
			const result = {
				name: 'test.node',
				displayName: 'Test Node',
				description: 'Test',
				inputs: [
					{ type: NodeConnectionTypes.Main },
					{ type: NodeConnectionTypes.AiTool, required: false },
				],
				outputs: [{ type: NodeConnectionTypes.Main }],
				score: 50,
			};

			const formatted = searchEngine.formatResult(result);

			expect(formatted).toContain(
				'<node_inputs>[{"type":"main"},{"type":"ai_tool","required":false}]</node_inputs>',
			);
			expect(formatted).toContain('<node_outputs>[{"type":"main"}]</node_outputs>');
		});
	});

	describe('static methods', () => {
		it('should identify AI connection types', () => {
			expect(NodeSearchEngine.isAiConnectionType('ai_tool')).toBe(true);
			expect(NodeSearchEngine.isAiConnectionType('ai_languageModel')).toBe(true);
			expect(NodeSearchEngine.isAiConnectionType('main')).toBe(false);
			expect(NodeSearchEngine.isAiConnectionType('Main')).toBe(false);
		});

		it('should get all AI connection types', () => {
			const aiTypes = NodeSearchEngine.getAiConnectionTypes();

			expect(aiTypes).toContain(NodeConnectionTypes.AiTool);
			expect(aiTypes).toContain(NodeConnectionTypes.AiLanguageModel);
			expect(aiTypes).toContain(NodeConnectionTypes.AiMemory);
			expect(aiTypes).not.toContain(NodeConnectionTypes.Main);

			// All should start with 'ai_'
			aiTypes.forEach((type) => {
				expect(type).toMatch(/^ai_/);
			});
		});
	});

	describe('edge cases and error handling', () => {
		it('should handle empty node types array', () => {
			const emptyEngine = new NodeSearchEngine([]);

			expect(emptyEngine.searchByName('test')).toEqual([]);
			expect(emptyEngine.searchByConnectionType(NodeConnectionTypes.AiTool)).toEqual([]);
		});

		it('should handle undefined/null in node properties', () => {
			const nodeWithNulls = createNodeType({
				name: 'test.nulls',
				displayName: 'Null Test',
				description: null as unknown as string,
				codex: {
					alias: null as unknown as string[],
				},
			});
			const engine = new NodeSearchEngine([nodeWithNulls]);

			expect(() => engine.searchByName('null')).not.toThrow();
			const results = engine.searchByName('null');
			expect(results).toHaveLength(1);
		});

		it('should handle very long queries', () => {
			const longQuery = 'a'.repeat(1000);

			expect(() => searchEngine.searchByName(longQuery)).not.toThrow();
			expect(() =>
				searchEngine.searchByConnectionType(NodeConnectionTypes.AiTool, 20, longQuery),
			).not.toThrow();
		});

		it('should handle special characters in queries', () => {
			const specialChars = ['(', ')', '[', ']', '{', '}', '.', '*', '+', '?', '^', '$', '|', '\\'];

			specialChars.forEach((char) => {
				expect(() => searchEngine.searchByName(char)).not.toThrow();
			});
		});
	});
});
