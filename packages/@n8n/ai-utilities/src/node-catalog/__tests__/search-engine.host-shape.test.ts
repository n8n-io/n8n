/**
 * Engine behaviour over a host-supplied `SearchableNodeType` rather than a full
 * `INodeTypeDescription`: result caching, n8n Connect metadata, and builder
 * hints. Moved here from @n8n/instance-ai when its forked search engine was
 * consolidated into this package.
 */

import type { NodeConnectionType } from 'n8n-workflow';

import { NodeSearchEngine, SCORE_WEIGHTS } from '../search-engine';
import type { SearchableNodeType } from '../types';
import { AI_CONNECTION_TYPES } from '../types';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeNode(overrides: Partial<SearchableNodeType> & { name: string }): SearchableNodeType {
	return {
		displayName: overrides.displayName ?? overrides.name,
		description: overrides.description ?? 'A test node',
		version: overrides.version ?? 1,
		inputs: overrides.inputs ?? ['main'],
		outputs: overrides.outputs ?? ['main'],
		...overrides,
	};
}

const httpNode = makeNode({
	name: 'n8n-nodes-base.httpRequest',
	displayName: 'HTTP Request',
	description: 'Makes HTTP requests',
	codex: { alias: ['api', 'fetch', 'curl'] },
});

const setNode = makeNode({
	name: 'n8n-nodes-base.set',
	displayName: 'Edit Fields',
	description: 'Set or change values',
	codex: { alias: ['set', 'assign'] },
});

const slackNode = makeNode({
	name: 'n8n-nodes-base.slack',
	displayName: 'Slack',
	description: 'Send messages to Slack',
});

/**
 * A host's `builderHint` carries fields the engine does not declare, such as
 * `extraTypeDefContent`. Built outside the `makeNode` literal so it reaches the
 * engine the same way a real host's wider object does, rather than tripping the
 * excess-property check that only applies to fresh literals.
 */
const agentBuilderHint = {
	searchHint: 'Use an AI Agent for autonomous task execution',
	inputs: {
		ai_languageModel: { required: true },
		ai_memory: { required: false },
		ai_tool: { required: false, displayOptions: { show: { hasTools: [true] } } },
	},
	extraTypeDefContent: [
		{
			content:
				'<patterns>\n<pattern title="basic">\nconst agent = node({ ... })\n</pattern>\n</patterns>',
		},
	],
};

const agentNode = makeNode({
	name: '@n8n/n8n-nodes-langchain.agent',
	displayName: 'AI Agent',
	description: 'An AI agent that uses tools',
	inputs: ['main', 'ai_languageModel', 'ai_memory', 'ai_tool'],
	outputs: ['main'],
	builderHint: agentBuilderHint,
});

const openAiNode = makeNode({
	name: '@n8n/n8n-nodes-langchain.openAi',
	displayName: 'OpenAI',
	description: 'OpenAI node for chat, assistants, and legacy operations',
	builderHint: {
		searchHint: 'For text generation, reasoning and tools, use AI Agent with OpenAI Chat Model',
	},
});

const openAiLmNode = makeNode({
	name: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
	displayName: 'OpenAI Chat Model',
	description: 'OpenAI language model',
	outputs: ['ai_languageModel'],
});

const memoryNode = makeNode({
	name: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
	displayName: 'Window Buffer Memory',
	description: 'Simple buffer memory',
	outputs: ['ai_memory'],
});

const embeddingNode = makeNode({
	name: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
	displayName: 'OpenAI Embeddings',
	description: 'OpenAI embeddings model',
	outputs: ['ai_embedding'],
});

const vectorStoreNode = makeNode({
	name: '@n8n/n8n-nodes-langchain.vectorStoreInMemory',
	displayName: 'In-Memory Vector Store',
	description: 'In-memory vector store',
	outputs: ['ai_vectorStore'],
});

const expressionOutputNode = makeNode({
	name: 'n8n-nodes-base.dynamicOutput',
	displayName: 'Dynamic Output',
	description: 'Node with expression outputs',
	outputs: '={{["main","ai_tool"]}}',
});

const dataTableToolNode = makeNode({
	name: 'n8n-nodes-base.dataTableTool',
	displayName: 'n8n Data Table Tool',
	description: 'Read, create, update, and delete rows in n8n data tables from an AI agent',
	outputs: ['ai_tool'],
});

const googleCalendarNode = makeNode({
	name: 'n8n-nodes-base.googleCalendar',
	displayName: 'Google Calendar',
	description: 'Consume Google Calendar API',
});

// Node covered by n8n Connect (the gateway config annotates it with `aiGateway`).
const firecrawlNode = makeNode({
	name: 'n8n-nodes-base.firecrawl',
	displayName: 'Firecrawl',
	description: 'Scrape and crawl the web',
	aiGateway: { supported: true, minVersion: 1 },
});

const googleCalendarToolNode = makeNode({
	name: 'n8n-nodes-base.googleCalendarTool',
	displayName: 'Google Calendar Tool',
	description: 'Consume Google Calendar API as a tool for AI agents',
	outputs: ['ai_tool'],
});

const slackToolNode = makeNode({
	name: 'n8n-nodes-base.slackTool',
	displayName: 'Slack Tool',
	description: 'Send messages to Slack from an AI agent',
	outputs: ['ai_tool'],
});

const allNodes = [
	httpNode,
	setNode,
	slackNode,
	agentNode,
	openAiNode,
	openAiLmNode,
	memoryNode,
	embeddingNode,
	vectorStoreNode,
	expressionOutputNode,
	dataTableToolNode,
	googleCalendarNode,
	googleCalendarToolNode,
	slackToolNode,
	firecrawlNode,
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NodeSearchEngine', () => {
	let engine: NodeSearchEngine;

	beforeEach(() => {
		engine = new NodeSearchEngine(allNodes);
	});

	// -----------------------------------------------------------------------
	// searchByName
	// -----------------------------------------------------------------------

	describe('searchByName', () => {
		it('should find nodes by display name', () => {
			const results = engine.searchByName('HTTP');
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].name).toBe('n8n-nodes-base.httpRequest');
		});

		it('should find nodes by alias', () => {
			const results = engine.searchByName('curl');
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].name).toBe('n8n-nodes-base.httpRequest');
		});

		it('should find nodes by description fallback', () => {
			const results = engine.searchByName('requests');
			expect(results.map((r) => r.name)).toContain('n8n-nodes-base.httpRequest');
		});

		it('should return fresh cached result objects', () => {
			const first = engine.searchByName('AI Agent');
			const agentResult = first.find((r) => r.name === '@n8n/n8n-nodes-langchain.agent');
			expect(agentResult).toBeDefined();
			agentResult!.displayName = 'Mutated Agent';

			const second = engine.searchByName('AI Agent');
			expect(second.find((r) => r.name === '@n8n/n8n-nodes-langchain.agent')?.displayName).toBe(
				'AI Agent',
			);
		});

		it('should respect the limit parameter', () => {
			const results = engine.searchByName('n', 2);
			expect(results.length).toBeLessThanOrEqual(2);
		});

		it('should include the builder search hint alongside subnode requirements', () => {
			const results = engine.searchByName('AI Agent');
			const agentResult = results.find((r) => r.name === '@n8n/n8n-nodes-langchain.agent');
			expect(agentResult).toBeDefined();
			expect(agentResult?.builderHintMessage).toBe('Use an AI Agent for autonomous task execution');
		});

		it('should include builder search hint when present', () => {
			const results = engine.searchByName('OpenAI');
			const openAiResult = results.find((r) => r.name === '@n8n/n8n-nodes-langchain.openAi');
			expect(openAiResult).toBeDefined();
			expect(openAiResult?.builderHintMessage).toBe(
				'For text generation, reasoning and tools, use AI Agent with OpenAI Chat Model',
			);
			expect(engine.formatResult(openAiResult!)).toContain(
				'<builder_hint>For text generation, reasoning and tools, use AI Agent with OpenAI Chat Model</builder_hint>',
			);
		});

		it('should NOT surface builderHint.extraTypeDefContent in search results', () => {
			const results = engine.searchByName('AI Agent');
			const agentResult = results.find((r) => r.name === '@n8n/n8n-nodes-langchain.agent');
			expect(agentResult).toBeDefined();
			// Result type has no extraTypeDefContent field; assert it never leaks in
			// via untyped assignment either.
			expect(agentResult).not.toHaveProperty('extraTypeDefContent');
			expect(JSON.stringify(agentResult)).not.toContain('<patterns>');
			expect(JSON.stringify(agentResult)).not.toContain('basic');
			// The formatted XML the LLM actually sees must not contain the example.
			const xml = engine.formatResult(agentResult!);
			expect(xml).not.toContain('<patterns>');
			expect(xml).not.toContain('const agent = node');
		});

		it('should include subnode requirements when present', () => {
			const results = engine.searchByName('AI Agent');
			const agentResult = results.find((r) => r.name === '@n8n/n8n-nodes-langchain.agent');
			expect(agentResult?.subnodeRequirements).toBeDefined();
			expect(agentResult?.subnodeRequirements).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						connectionType: 'ai_languageModel',
						required: true,
					}),
				]),
			);
		});

		it('should surface aiGateway meta for nodes covered by n8n Connect', () => {
			const results = engine.searchByName('Firecrawl');
			const firecrawlResult = results.find((r) => r.name === 'n8n-nodes-base.firecrawl');
			expect(firecrawlResult?.aiGateway).toEqual({ supported: true, minVersion: 1 });
		});

		it('should omit aiGateway for nodes not covered by n8n Connect', () => {
			const results = engine.searchByName('HTTP');
			const httpResult = results.find((r) => r.name === 'n8n-nodes-base.httpRequest');
			expect(httpResult).toBeDefined();
			expect(httpResult).not.toHaveProperty('aiGateway');
		});

		it('should match by exact type name even when fuzzy search misses', () => {
			const results = engine.searchByName('set');
			const setResult = results.find((r) => r.name === 'n8n-nodes-base.set');
			expect(setResult).toBeDefined();
		});

		it('should return latest version in results', () => {
			const results = engine.searchByName('HTTP');
			const httpResult = results.find((r) => r.name === 'n8n-nodes-base.httpRequest');
			expect(httpResult?.version).toBe(1);
		});

		it('should handle multi-word queries by splitting into terms', () => {
			const results = engine.searchByName('data table tool');
			const dataTableResult = results.find((r) => r.name === 'n8n-nodes-base.dataTableTool');
			expect(dataTableResult).toBeDefined();
		});

		it('should find nodes when multi-word query matches display name partially', () => {
			const results = engine.searchByName('google calendar');
			const names = results.map((r) => r.name);
			expect(names).toContain('n8n-nodes-base.googleCalendar');
			expect(names).toContain('n8n-nodes-base.googleCalendarTool');
		});
	});

	// -----------------------------------------------------------------------
	// searchByConnectionType
	// -----------------------------------------------------------------------

	describe('searchByConnectionType', () => {
		it('should find nodes by connection type in outputs array', () => {
			const results = engine.searchByConnectionType('ai_languageModel');
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].name).toBe('@n8n/n8n-nodes-langchain.lmChatOpenAi');
			expect(results[0].score).toBe(SCORE_WEIGHTS.CONNECTION_EXACT);
		});

		it('should find nodes by connection type in expression string', () => {
			const results = engine.searchByConnectionType('ai_tool');
			const dynamicResult = results.find((r) => r.name === 'n8n-nodes-base.dynamicOutput');
			expect(dynamicResult).toBeDefined();
			expect(dynamicResult?.score).toBe(SCORE_WEIGHTS.CONNECTION_IN_EXPRESSION);
		});

		it('should apply name filter when provided', () => {
			const results = engine.searchByConnectionType('ai_memory', 20, 'window');
			expect(results.length).toBeGreaterThan(0);
			expect(results[0].name).toBe('@n8n/n8n-nodes-langchain.memoryBufferWindow');
		});

		it('should return empty for unknown connection type', () => {
			const results = engine.searchByConnectionType('ai_nonexistent' as NodeConnectionType);
			expect(results).toEqual([]);
		});

		it('should respect the limit parameter', () => {
			const results = engine.searchByConnectionType('ai_languageModel', 1);
			expect(results.length).toBeLessThanOrEqual(1);
		});

		it('should find tool nodes with multi-word name filter', () => {
			const results = engine.searchByConnectionType('ai_tool', 10, 'data table tool');
			const dataTableResult = results.find((r) => r.name === 'n8n-nodes-base.dataTableTool');
			expect(dataTableResult).toBeDefined();
		});

		it('should find google calendar tool via connectionType + query', () => {
			const results = engine.searchByConnectionType('ai_tool', 10, 'google calendar');
			const calendarTool = results.find((r) => r.name === 'n8n-nodes-base.googleCalendarTool');
			expect(calendarTool).toBeDefined();
		});

		it('should not return regular nodes when filtering by connectionType', () => {
			const results = engine.searchByConnectionType('ai_tool', 10, 'google calendar');
			const regularCalendar = results.find((r) => r.name === 'n8n-nodes-base.googleCalendar');
			expect(regularCalendar).toBeUndefined();
		});
	});

	// -----------------------------------------------------------------------
	// getRelatedSubnodeIds
	// -----------------------------------------------------------------------

	describe('getRelatedSubnodeIds', () => {
		it('should return related subnode IDs from builderHint.inputs', () => {
			const related = engine.getRelatedSubnodeIds(['@n8n/n8n-nodes-langchain.agent'], new Set());
			expect(related.has('@n8n/n8n-nodes-langchain.lmChatOpenAi')).toBe(true);
			expect(related.has('@n8n/n8n-nodes-langchain.memoryBufferWindow')).toBe(true);
		});

		it('should exclude IDs in the excludeNodeIds set', () => {
			const related = engine.getRelatedSubnodeIds(
				['@n8n/n8n-nodes-langchain.agent'],
				new Set(['@n8n/n8n-nodes-langchain.lmChatOpenAi']),
			);
			expect(related.has('@n8n/n8n-nodes-langchain.lmChatOpenAi')).toBe(false);
			expect(related.has('@n8n/n8n-nodes-langchain.memoryBufferWindow')).toBe(true);
		});

		it('should return empty set for nodes without builderHint.inputs', () => {
			const related = engine.getRelatedSubnodeIds(['n8n-nodes-base.httpRequest'], new Set());
			expect(related.size).toBe(0);
		});

		it('should not include the initial node IDs in the result', () => {
			const related = engine.getRelatedSubnodeIds(['@n8n/n8n-nodes-langchain.agent'], new Set());
			expect(related.has('@n8n/n8n-nodes-langchain.agent')).toBe(false);
		});
	});

	// -----------------------------------------------------------------------
	// formatResult
	// -----------------------------------------------------------------------

	describe('formatResult', () => {
		it('should produce XML with node_name, version, description, inputs, outputs', () => {
			const result: NodeSearchEngine extends { formatResult: (r: infer R) => string } ? R : never =
				{
					name: 'n8n-nodes-base.httpRequest',
					displayName: 'HTTP Request',
					description: 'Makes HTTP requests',
					version: 1,
					score: 100,
					inputs: ['main'],
					outputs: ['main'],
				};

			const xml = engine.formatResult(result);
			expect(xml).toContain('<node_name>n8n-nodes-base.httpRequest</node_name>');
			expect(xml).toContain('<node_version>1</node_version>');
			expect(xml).toContain('<node_description>Makes HTTP requests</node_description>');
			expect(xml).toContain('<node_inputs>["main"]</node_inputs>');
			expect(xml).toContain('<node_outputs>["main"]</node_outputs>');
		});

		it('should include builder_hint when builderHintMessage is set', () => {
			const result = {
				name: 'test.node',
				displayName: 'Test',
				description: 'test',
				version: 1,
				score: 0,
				inputs: ['main'],
				outputs: ['main'],
				builderHintMessage: 'Use this wisely',
			};

			const xml = engine.formatResult(result);
			expect(xml).toContain('<builder_hint>Use this wisely</builder_hint>');
		});

		it('should include subnode_requirements when present', () => {
			const result = {
				name: 'test.node',
				displayName: 'Test',
				description: 'test',
				version: 1,
				score: 0,
				inputs: ['main'],
				outputs: ['main'],
				subnodeRequirements: [
					{ connectionType: 'ai_languageModel', required: true },
					{
						connectionType: 'ai_tool',
						required: false,
						displayOptions: { show: { hasTools: [true] } },
					},
				],
			};

			const xml = engine.formatResult(result);
			expect(xml).toContain('<subnode_requirements>');
			expect(xml).toContain('type="ai_languageModel" status="required"');
			expect(xml).toContain('type="ai_tool" status="optional"');
			expect(xml).toContain('<display_options>');
		});

		it('should include n8n_credits marker when aiGateway is present', () => {
			const result = {
				name: 'n8n-nodes-base.firecrawl',
				displayName: 'Firecrawl',
				description: 'Scrape the web',
				version: 1,
				score: 0,
				inputs: ['main'],
				outputs: ['main'],
				aiGateway: { supported: true as const, minVersion: 2 },
			};

			const xml = engine.formatResult(result);
			expect(xml).toContain('<n8n_credits supported="true" min_version="2" />');
		});

		it('should omit n8n_credits marker when aiGateway is absent', () => {
			const result = {
				name: 'test.node',
				displayName: 'Test',
				description: 'test',
				version: 1,
				score: 0,
				inputs: ['main'],
				outputs: ['main'],
			};

			expect(engine.formatResult(result)).not.toContain('n8n_credits');
		});

		it('should handle string inputs/outputs', () => {
			const result = {
				name: 'test.node',
				displayName: 'Test',
				description: 'test',
				version: 1,
				score: 0,
				inputs: '={{["main"]}}' as string | string[],
				outputs: '={{["main"]}}' as string | string[],
			};

			const xml = engine.formatResult(result);
			expect(xml).toContain('<node_inputs>={{["main"]}}</node_inputs>');
			expect(xml).toContain('<node_outputs>={{["main"]}}</node_outputs>');
		});
	});

	// -----------------------------------------------------------------------
	// Deduplication
	// -----------------------------------------------------------------------

	describe('deduplication', () => {
		it('should keep only the latest version of a node', () => {
			const v1 = makeNode({
				name: 'n8n-nodes-base.http',
				displayName: 'HTTP v1',
				version: 1,
			});
			const v2 = makeNode({
				name: 'n8n-nodes-base.http',
				displayName: 'HTTP v2',
				version: 2,
			});

			const deduped = new NodeSearchEngine([v1, v2]);
			const results = deduped.searchByName('HTTP');
			const httpResults = results.filter((r) => r.name === 'n8n-nodes-base.http');
			expect(httpResults).toHaveLength(1);
			expect(httpResults[0].version).toBe(2);
		});

		it('should handle version arrays and keep the one with highest max', () => {
			const v1 = makeNode({
				name: 'n8n-nodes-base.http',
				displayName: 'HTTP',
				version: [1, 2],
			});
			const v2 = makeNode({
				name: 'n8n-nodes-base.http',
				displayName: 'HTTP',
				version: [1, 2, 3],
			});

			const deduped = new NodeSearchEngine([v1, v2]);
			const nodeType = deduped.getNodeType('n8n-nodes-base.http');
			expect(nodeType).toBeDefined();
			// The version with max 3 should win
			expect(nodeType?.version).toEqual([1, 2, 3]);
		});
	});

	// -----------------------------------------------------------------------
	// Input handling
	// -----------------------------------------------------------------------

	describe('host shapes carrying extra fields', () => {
		it('reads a host node that also carries a properties array, leaving it untouched', () => {
			// `properties` is the field a full INodeTypeDescription is recognised by,
			// and a host shape is free to carry one too. Its presence must not make the
			// engine reshape the node.
			const hostNodeWithProperties = {
				...makeNode({
					name: 'n8n-nodes-base.hostish',
					displayName: 'Hostish Node',
					description: 'A host shape that also exposes properties',
					outputs: ['ai_tool'],
					builderHint: { searchHint: 'host hint' },
				}),
				properties: [{ name: 'resource', type: 'options' }],
			};

			const engine = new NodeSearchEngine([hostNodeWithProperties]);

			// Same object back, so nothing converted or copied it on the way in.
			expect(engine.getNodeType('n8n-nodes-base.hostish')).toBe(hostNodeWithProperties);

			const [byName] = engine.searchByName('Hostish');
			expect(byName.displayName).toBe('Hostish Node');
			expect(byName.builderHintMessage).toBe('host hint');

			const [byConnection] = engine.searchByConnectionType('ai_tool' as NodeConnectionType);
			expect(byConnection.name).toBe('n8n-nodes-base.hostish');
		});
	});

	// -----------------------------------------------------------------------
	// Static methods
	// -----------------------------------------------------------------------

	describe('static methods', () => {
		describe('isAiConnectionType', () => {
			it('should return true for AI connection types', () => {
				expect(NodeSearchEngine.isAiConnectionType('ai_languageModel')).toBe(true);
				expect(NodeSearchEngine.isAiConnectionType('ai_tool')).toBe(true);
				expect(NodeSearchEngine.isAiConnectionType('ai_memory')).toBe(true);
			});

			it('should return false for non-AI connection types', () => {
				expect(NodeSearchEngine.isAiConnectionType('main')).toBe(false);
				expect(NodeSearchEngine.isAiConnectionType('http')).toBe(false);
				expect(NodeSearchEngine.isAiConnectionType('')).toBe(false);
			});
		});

		describe('getAiConnectionTypes', () => {
			it('should return all AI connection types', () => {
				const types = NodeSearchEngine.getAiConnectionTypes();
				expect(types).toEqual(AI_CONNECTION_TYPES);
				expect(types.length).toBeGreaterThan(0);
				for (const t of types) {
					expect(t.startsWith('ai_')).toBe(true);
				}
			});
		});
	});

	// -----------------------------------------------------------------------
	// getNodeType
	// -----------------------------------------------------------------------

	describe('getNodeType', () => {
		it('should return the node type for a known ID', () => {
			const nodeType = engine.getNodeType('n8n-nodes-base.httpRequest');
			expect(nodeType).toBeDefined();
			expect(nodeType?.displayName).toBe('HTTP Request');
		});

		it('should return undefined for an unknown ID', () => {
			expect(engine.getNodeType('nonexistent.node')).toBeUndefined();
		});
	});

	// -----------------------------------------------------------------------
	// getSubnodesForConnectionType
	// -----------------------------------------------------------------------

	describe('getSubnodesForConnectionType', () => {
		it('should return default subnodes for known connection types', () => {
			const lmSubnodes = engine.getSubnodesForConnectionType('ai_languageModel');
			expect(lmSubnodes).toEqual(['@n8n/n8n-nodes-langchain.lmChatOpenAi']);
		});

		it('should return empty array for ai_tool (intentionally excluded)', () => {
			expect(engine.getSubnodesForConnectionType('ai_tool')).toEqual([]);
		});

		it('should return empty array for unknown connection type', () => {
			expect(engine.getSubnodesForConnectionType('unknown')).toEqual([]);
		});
	});
});
