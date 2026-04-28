/**
 * Tests for Code Builder Node Search Engine
 *
 * This is a fork of tools/engines/test/node-search-engine.test.ts for the code-builder agent.
 * It tests the additional features specific to the code-builder workflow generation approach.
 */

import {
	NodeConnectionTypes,
	type INodeTypeDescription,
	type NodeConnectionType,
} from 'n8n-workflow';

import { createNodeType } from '../../../../test/test-utils';
import { CodeBuilderNodeSearchEngine, SCORE_WEIGHTS } from '../code-builder-node-search-engine';

describe('CodeBuilderNodeSearchEngine', () => {
	let searchEngine: CodeBuilderNodeSearchEngine;
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

		searchEngine = new CodeBuilderNodeSearchEngine(nodeTypes);
	});

	describe('searchByName', () => {
		it('should find nodes by exact name match', () => {
			const results = searchEngine.searchByName('Code');

			expect(results.length).toBeGreaterThanOrEqual(1);
			// First result should be the Code node with highest score
			expect(results[0].name).toBe('n8n-nodes-base.code');
			expect(results[0].displayName).toBe('Code');
			// Should have a positive score from sublimeSearch fuzzy matching
			expect(results[0].score).toBeGreaterThan(0);
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
			expect(results[0].score).toBeGreaterThan(0);
		});

		it('should find nodes by alias match', () => {
			const results = searchEngine.searchByName('httpbin');

			expect(results).toHaveLength(1);
			expect(results[0].name).toBe('n8n-nodes-base.httpBin');
			expect(results[0].score).toBeGreaterThan(0);
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
			expect(results[0].score).toBeGreaterThan(0);
		});

		it('should handle nodes without description', () => {
			const nodeWithoutDesc = createNodeType({
				name: 'test.node',
				displayName: 'Test Node',
				description: undefined,
			});
			const engine = new CodeBuilderNodeSearchEngine([nodeWithoutDesc]);

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

			const engineWithMalformed = new CodeBuilderNodeSearchEngine([...nodeTypes, malformedNode]);

			// Should not throw and should return valid results
			expect(() => engineWithMalformed.searchByName('http')).not.toThrow();
			const results = engineWithMalformed.searchByName('http');
			expect(results.length).toBeGreaterThan(0);
		});
	});

	describe('searchByName - type name priority', () => {
		it('should return node with matching type name as first result', () => {
			const setNode = createNodeType({
				name: 'n8n-nodes-base.set',
				displayName: 'Edit Fields',
				description: 'Modify, add, or remove item fields',
				group: ['transform'],
			});
			const settingsNode = createNodeType({
				name: 'n8n-nodes-base.settingsManager',
				displayName: 'Settings Manager',
				description: 'Manage application settings',
				group: ['transform'],
			});
			const datasetNode = createNodeType({
				name: 'n8n-nodes-base.dataset',
				displayName: 'Dataset',
				description: 'Work with datasets',
				group: ['transform'],
			});
			const engine = new CodeBuilderNodeSearchEngine([
				...nodeTypes,
				setNode,
				settingsNode,
				datasetNode,
			]);

			const results = engine.searchByName('set', 5);

			expect(results.length).toBeGreaterThanOrEqual(1);
			expect(results[0].name).toBe('n8n-nodes-base.set');
			expect(results[0].displayName).toBe('Edit Fields');
		});

		it('should return type name match first even with small limit', () => {
			const setNode = createNodeType({
				name: 'n8n-nodes-base.set',
				displayName: 'Edit Fields',
				description: 'Modify, add, or remove item fields',
				group: ['transform'],
			});
			const competitors = Array.from({ length: 10 }, (_, i) =>
				createNodeType({
					name: `n8n-nodes-base.setter${i}`,
					displayName: `Setter Node ${i}`,
					description: `Sets values for configuration ${i}`,
					group: ['transform'],
				}),
			);
			const engine = new CodeBuilderNodeSearchEngine([...competitors, setNode]);

			const results = engine.searchByName('set', 3);

			expect(results[0].name).toBe('n8n-nodes-base.set');
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
			const engine = new CodeBuilderNodeSearchEngine([...nodeTypes, anotherTool]);

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
			const engine = new CodeBuilderNodeSearchEngine([...nodeTypes, expressionNode]);

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
			const engine = new CodeBuilderNodeSearchEngine([...nodeTypes, exactMatch, expressionMatch]);

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
			const engine = new CodeBuilderNodeSearchEngine([...nodeTypes, ...manyNodes]);

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
				version: 1,
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
				version: 1,
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
				version: 1,
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
				version: 1,
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
			expect(CodeBuilderNodeSearchEngine.isAiConnectionType('ai_tool')).toBe(true);
			expect(CodeBuilderNodeSearchEngine.isAiConnectionType('ai_languageModel')).toBe(true);
			expect(CodeBuilderNodeSearchEngine.isAiConnectionType('main')).toBe(false);
			expect(CodeBuilderNodeSearchEngine.isAiConnectionType('Main')).toBe(false);
		});

		it('should get all AI connection types', () => {
			const aiTypes = CodeBuilderNodeSearchEngine.getAiConnectionTypes();

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
			const emptyEngine = new CodeBuilderNodeSearchEngine([]);

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
			const engine = new CodeBuilderNodeSearchEngine([nodeWithNulls]);

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

	describe('node version deduplication', () => {
		it('should deduplicate nodes with same name but different versions', () => {
			const nodeV1 = createNodeType({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request V1',
				version: 1,
			});
			const nodeV2 = createNodeType({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request V2',
				version: 2,
			});
			const nodeV3 = createNodeType({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request V3',
				version: 3,
			});

			const engine = new CodeBuilderNodeSearchEngine([nodeV1, nodeV2, nodeV3]);
			const results = engine.searchByName('http');

			// Should only return one node (the latest version)
			expect(results).toHaveLength(1);
			expect(results[0]?.version).toBe(3);
			expect(results[0]?.displayName).toBe('HTTP Request V3');
		});

		it('should handle array versions and return latest', () => {
			const nodeV1 = createNodeType({
				name: 'n8n-nodes-base.code',
				displayName: 'Code V1',
				version: 1,
			});
			const nodeV2V3 = createNodeType({
				name: 'n8n-nodes-base.code',
				displayName: 'Code V2-3',
				version: [2, 3],
			});

			const engine = new CodeBuilderNodeSearchEngine([nodeV1, nodeV2V3]);
			const results = engine.searchByName('code');

			// Should return the node with array version [2, 3] as latest
			expect(results).toHaveLength(1);
			expect(results[0]?.version).toBe(3);
			expect(results[0]?.displayName).toBe('Code V2-3');
		});

		it('should return latest version when comparing single version vs array version', () => {
			const nodeV1V2 = createNodeType({
				name: 'n8n-nodes-base.webhook',
				displayName: 'Webhook V1-2',
				version: [1, 2],
			});
			const nodeV3 = createNodeType({
				name: 'n8n-nodes-base.webhook',
				displayName: 'Webhook V3',
				version: 3,
			});

			const engine = new CodeBuilderNodeSearchEngine([nodeV1V2, nodeV3]);
			const results = engine.searchByName('webhook');

			expect(results).toHaveLength(1);
			expect(results[0]?.version).toBe(3);
			expect(results[0]?.displayName).toBe('Webhook V3');
		});

		it('should include version field in all search results', () => {
			const results = searchEngine.searchByName('code');

			expect(results.length).toBeGreaterThan(0);
			results.forEach((result) => {
				expect(result.version).toBeDefined();
				expect(typeof result.version).toBe('number');
			});
		});

		it('should include version field in connection type search results', () => {
			const results = searchEngine.searchByConnectionType(NodeConnectionTypes.AiTool);

			expect(results.length).toBeGreaterThan(0);
			results.forEach((result) => {
				expect(result.version).toBeDefined();
				expect(typeof result.version).toBe('number');
			});
		});

		it('should include version in formatted XML output', () => {
			const results = searchEngine.searchByName('code', 1);
			expect(results.length).toBeGreaterThan(0);

			const formatted = searchEngine.formatResult(results[0]);
			expect(formatted).toContain('<node_version>');
			expect(formatted).toMatch(/<node_version>\d+<\/node_version>/);
		});
	});

	describe('subnode requirements', () => {
		it('should extract subnode requirements from builderHint.inputs', () => {
			const agentNode = createNodeType({
				name: '@n8n/n8n-nodes-langchain.agent',
				displayName: 'AI Agent',
				builderHint: {
					inputs: {
						ai_languageModel: { required: true },
						ai_memory: { required: false },
						ai_tool: { required: false },
						ai_outputParser: {
							required: false,
							displayOptions: { show: { hasOutputParser: [true] } },
						},
					},
					message: 'Use with output parser for structured output',
				},
			});
			const engine = new CodeBuilderNodeSearchEngine([agentNode]);

			const results = engine.searchByName('agent');

			expect(results).toHaveLength(1);
			expect(results[0].subnodeRequirements).toBeDefined();
			expect(results[0].subnodeRequirements).toHaveLength(4);

			// Check required language model
			const lmReq = results[0].subnodeRequirements!.find(
				(r) => r.connectionType === 'ai_languageModel',
			);
			expect(lmReq).toBeDefined();
			expect(lmReq!.required).toBe(true);

			// Check optional memory
			const memReq = results[0].subnodeRequirements!.find((r) => r.connectionType === 'ai_memory');
			expect(memReq).toBeDefined();
			expect(memReq!.required).toBe(false);

			// Check conditional output parser
			const parserReq = results[0].subnodeRequirements!.find(
				(r) => r.connectionType === 'ai_outputParser',
			);
			expect(parserReq).toBeDefined();
			expect(parserReq!.required).toBe(false);
			expect(parserReq!.displayOptions).toEqual({ show: { hasOutputParser: [true] } });

			// Check builder hint message
			expect(results[0].builderHintMessage).toBe('Use with output parser for structured output');
		});

		it('should not include subnodeRequirements for nodes without builderHint.inputs', () => {
			const basicNode = createNodeType({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
			});
			const engine = new CodeBuilderNodeSearchEngine([basicNode]);

			const results = engine.searchByName('http');

			expect(results).toHaveLength(1);
			expect(results[0].subnodeRequirements).toBeUndefined();
		});

		it('should include subnodeRequirements in searchByConnectionType results', () => {
			const openAiModel = createNodeType({
				name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				displayName: 'OpenAI Chat Model',
				outputs: ['ai_languageModel'],
				builderHint: {
					inputs: {
						ai_embedding: { required: false },
					},
				},
			});
			const engine = new CodeBuilderNodeSearchEngine([openAiModel]);

			const results = engine.searchByConnectionType(NodeConnectionTypes.AiLanguageModel);

			expect(results).toHaveLength(1);
			expect(results[0].subnodeRequirements).toBeDefined();
			expect(results[0].subnodeRequirements).toHaveLength(1);
			expect(results[0].subnodeRequirements![0].connectionType).toBe('ai_embedding');
		});

		it('should format subnode requirements in XML output', () => {
			const agentNode = createNodeType({
				name: '@n8n/n8n-nodes-langchain.agent',
				displayName: 'AI Agent',
				builderHint: {
					inputs: {
						ai_languageModel: { required: true },
						ai_outputParser: {
							required: false,
							displayOptions: { show: { hasOutputParser: [true] } },
						},
					},
					message: 'Test hint message',
				},
			});
			const engine = new CodeBuilderNodeSearchEngine([agentNode]);

			const results = engine.searchByName('agent');
			const formatted = engine.formatResult(results[0]);

			// Check builder hint
			expect(formatted).toContain('<builder_hint>Test hint message</builder_hint>');

			// Check subnode requirements section
			expect(formatted).toContain('<subnode_requirements>');
			expect(formatted).toContain('type="ai_languageModel"');
			expect(formatted).toContain('status="required"');
			expect(formatted).toContain('type="ai_outputParser"');
			expect(formatted).toContain('status="optional"');
			expect(formatted).toContain('<display_options>');
			expect(formatted).toContain('hasOutputParser');
			expect(formatted).toContain('</subnode_requirements>');
		});

		it('should not include subnode_requirements in XML for nodes without inputs', () => {
			const basicNode = createNodeType({
				name: 'n8n-nodes-base.code',
				displayName: 'Code',
			});
			const engine = new CodeBuilderNodeSearchEngine([basicNode]);

			const results = engine.searchByName('code');
			const formatted = engine.formatResult(results[0]);

			expect(formatted).not.toContain('<subnode_requirements>');
			expect(formatted).not.toContain('<builder_hint>');
		});
	});

	describe('getSubnodesForConnectionType', () => {
		it('should return default subnodes for ai_languageModel', () => {
			const engine = new CodeBuilderNodeSearchEngine([]);

			const subnodes = engine.getSubnodesForConnectionType('ai_languageModel');

			expect(subnodes).toContain('@n8n/n8n-nodes-langchain.lmChatOpenAi');
		});

		it('should return default subnodes for ai_memory', () => {
			const engine = new CodeBuilderNodeSearchEngine([]);

			const subnodes = engine.getSubnodesForConnectionType('ai_memory');

			expect(subnodes).toContain('@n8n/n8n-nodes-langchain.memoryBufferWindow');
		});

		it('should return default subnodes for ai_embedding', () => {
			const engine = new CodeBuilderNodeSearchEngine([]);

			const subnodes = engine.getSubnodesForConnectionType('ai_embedding');

			expect(subnodes).toContain('@n8n/n8n-nodes-langchain.embeddingsOpenAi');
		});

		it('should return empty array for ai_tool (varies by use case)', () => {
			const engine = new CodeBuilderNodeSearchEngine([]);

			const subnodes = engine.getSubnodesForConnectionType('ai_tool');

			expect(subnodes).toEqual([]);
		});

		it('should return empty array for unknown connection type', () => {
			const engine = new CodeBuilderNodeSearchEngine([]);

			const subnodes = engine.getSubnodesForConnectionType('unknown_type');

			expect(subnodes).toEqual([]);
		});
	});

	describe('getRelatedSubnodeIds', () => {
		it('should find related subnodes based on builderHint.inputs', () => {
			const agentNode = createNodeType({
				name: '@n8n/n8n-nodes-langchain.agent',
				displayName: 'AI Agent',
				builderHint: {
					inputs: {
						ai_languageModel: { required: true },
						ai_memory: { required: false },
					},
				},
			});
			const openAiModel = createNodeType({
				name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				displayName: 'OpenAI Chat Model',
				outputs: ['ai_languageModel'],
			});
			const bufferMemory = createNodeType({
				name: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
				displayName: 'Window Buffer Memory',
				outputs: ['ai_memory'],
			});
			const engine = new CodeBuilderNodeSearchEngine([agentNode, openAiModel, bufferMemory]);

			const relatedIds = engine.getRelatedSubnodeIds(['@n8n/n8n-nodes-langchain.agent'], new Set());

			expect(relatedIds.has('@n8n/n8n-nodes-langchain.lmChatOpenAi')).toBe(true);
			expect(relatedIds.has('@n8n/n8n-nodes-langchain.memoryBufferWindow')).toBe(true);
		});

		it('should recursively find nested subnode requirements', () => {
			// Create a chain: Vector Store Memory -> In-Memory Vector Store -> OpenAI Embeddings
			const vectorMemory = createNodeType({
				name: '@n8n/n8n-nodes-langchain.memoryVectorStore',
				displayName: 'Vector Store Memory',
				outputs: ['ai_memory'],
				builderHint: {
					inputs: {
						ai_vectorStore: { required: true },
					},
				},
			});
			const inMemoryVectorStore = createNodeType({
				name: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
				displayName: 'In-Memory Vector Store',
				outputs: ['ai_vectorStore'],
				builderHint: {
					inputs: {
						ai_embedding: { required: true },
					},
				},
			});
			const openAiEmbeddings = createNodeType({
				name: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
				displayName: 'OpenAI Embeddings',
				outputs: ['ai_embedding'],
			});

			const engine = new CodeBuilderNodeSearchEngine([
				vectorMemory,
				inMemoryVectorStore,
				openAiEmbeddings,
			]);

			const relatedIds = engine.getRelatedSubnodeIds(
				['@n8n/n8n-nodes-langchain.memoryVectorStore'],
				new Set(),
			);

			// Should find the in-memory vector store (direct requirement)
			expect(relatedIds.has('@n8n/n8n-nodes-langchain.vectorStoreInMemory')).toBe(true);
			// Should also find OpenAI embeddings (nested requirement of vector store)
			expect(relatedIds.has('@n8n/n8n-nodes-langchain.embeddingsOpenAi')).toBe(true);
		});

		it('should exclude already shown node IDs', () => {
			const agentNode = createNodeType({
				name: '@n8n/n8n-nodes-langchain.agent',
				displayName: 'AI Agent',
				builderHint: {
					inputs: {
						ai_languageModel: { required: true },
					},
				},
			});
			const openAiModel = createNodeType({
				name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				displayName: 'OpenAI Chat Model',
				outputs: ['ai_languageModel'],
			});
			const engine = new CodeBuilderNodeSearchEngine([agentNode, openAiModel]);

			// Exclude OpenAI model from results
			const relatedIds = engine.getRelatedSubnodeIds(
				['@n8n/n8n-nodes-langchain.agent'],
				new Set(['@n8n/n8n-nodes-langchain.lmChatOpenAi']),
			);

			expect(relatedIds.has('@n8n/n8n-nodes-langchain.lmChatOpenAi')).toBe(false);
		});

		it('should return empty set for nodes without builderHint.inputs', () => {
			const basicNode = createNodeType({
				name: 'n8n-nodes-base.httpRequest',
				displayName: 'HTTP Request',
			});
			const engine = new CodeBuilderNodeSearchEngine([basicNode]);

			const relatedIds = engine.getRelatedSubnodeIds(['n8n-nodes-base.httpRequest'], new Set());

			expect(relatedIds.size).toBe(0);
		});
	});

	describe('getNodeType', () => {
		it('should return node type by ID', () => {
			const nodeType = searchEngine.getNodeType('n8n-nodes-base.code');

			expect(nodeType).toBeDefined();
			expect(nodeType!.name).toBe('n8n-nodes-base.code');
			expect(nodeType!.displayName).toBe('Code');
		});

		it('should return undefined for non-existent node', () => {
			const nodeType = searchEngine.getNodeType('nonexistent.node');

			expect(nodeType).toBeUndefined();
		});
	});
});
