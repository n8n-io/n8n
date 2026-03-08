/**
 * Tests for subnode utilities
 */

import { addNodeWithSubnodes } from './subnode-utils';
import type { GraphNode, NodeInstance } from '../types/base';

// Helper to create a minimal node instance
function createNode(
	overrides: Partial<NodeInstance<string, string, unknown>> = {},
): NodeInstance<string, string, unknown> {
	return {
		type: overrides.type ?? 'n8n-nodes-base.set',
		version: 'v1',
		id: overrides.id ?? 'node-id',
		name: overrides.name ?? 'Test Node',
		config: overrides.config ?? {},
		update: () => ({}) as NodeInstance<string, string, unknown>,
		then: () => ({}) as never,
		to: () => ({}) as never,
		input: () => ({
			_isInputTarget: true,
			node: {} as NodeInstance<string, string, unknown>,
			inputIndex: 0,
		}),
		output: () => ({}) as never,
		onError: () => ({}) as never,
		getConnections: () => [],
	} as NodeInstance<string, string, unknown>;
}

// Helper to create a subnode (model, memory, tool, etc.)
function createSubnode(
	overrides: Partial<NodeInstance<string, string, unknown>> = {},
): NodeInstance<string, string, unknown> {
	return {
		...createNode(overrides),
		_subnodeType: 'model', // Required for subnode types
	} as unknown as NodeInstance<string, string, unknown>;
}

describe('addNodeWithSubnodes', () => {
	describe('validation', () => {
		it('returns undefined for null node', () => {
			const nodes = new Map<string, GraphNode>();

			const result = addNodeWithSubnodes(
				nodes,
				null as unknown as NodeInstance<string, string, unknown>,
			);

			expect(result).toBeUndefined();
		});

		it('returns undefined for node without type', () => {
			const nodes = new Map<string, GraphNode>();
			const node = { name: 'Test' } as NodeInstance<string, string, unknown>;

			const result = addNodeWithSubnodes(nodes, node);

			expect(result).toBeUndefined();
		});

		it('returns undefined for node without name', () => {
			const nodes = new Map<string, GraphNode>();
			const node = { type: 'test' } as NodeInstance<string, string, unknown>;

			const result = addNodeWithSubnodes(nodes, node);

			expect(result).toBeUndefined();
		});
	});

	describe('adding nodes', () => {
		it('adds node to the map and returns its name', () => {
			const nodes = new Map<string, GraphNode>();
			const node = createNode({ name: 'My Node' });

			const result = addNodeWithSubnodes(nodes, node);

			expect(result).toBe('My Node');
			expect(nodes.has('My Node')).toBe(true);
			expect(nodes.get('My Node')?.instance).toBe(node);
		});

		it('returns existing key if same instance already in map', () => {
			const node = createNode({ name: 'Original Name' });
			const nodes = new Map<string, GraphNode>();
			nodes.set('Different Key', {
				instance: node,
				connections: new Map(),
			});

			const result = addNodeWithSubnodes(nodes, node);

			expect(result).toBe('Different Key');
			expect(nodes.size).toBe(1); // No new node added
		});

		it('generates unique name for duplicate node names', () => {
			const nodes = new Map<string, GraphNode>();
			const existingNode = createNode({ id: 'existing', name: 'Process' });
			nodes.set('Process', {
				instance: existingNode,
				connections: new Map(),
			});

			const newNode = createNode({ id: 'new', name: 'Process' });
			const result = addNodeWithSubnodes(nodes, newNode);

			expect(result).toBe('Process 1');
			expect(nodes.size).toBe(2);
			expect(nodes.get('Process 1')?.instance).toBe(newNode);
		});

		it('initializes main connections map', () => {
			const nodes = new Map<string, GraphNode>();
			const node = createNode({ name: 'Test' });

			addNodeWithSubnodes(nodes, node);

			const graphNode = nodes.get('Test');
			expect(graphNode?.connections.has('main')).toBe(true);
		});
	});

	describe('subnodes', () => {
		it('adds model subnode with ai_languageModel connection', () => {
			const nodes = new Map<string, GraphNode>();
			const modelSubnode = createSubnode({ name: 'GPT Model', type: 'lmChatOpenAi' });
			const agentNode = createNode({
				name: 'Agent',
				type: 'agent',
				config: {
					subnodes: {
						model: modelSubnode,
					},
				} as unknown as NodeInstance<string, string, unknown>['config'],
			});

			addNodeWithSubnodes(nodes, agentNode);

			expect(nodes.has('GPT Model')).toBe(true);
			const modelGraphNode = nodes.get('GPT Model');
			const aiConns = modelGraphNode?.connections.get('ai_languageModel');
			expect(aiConns?.get(0)).toContainEqual({
				node: 'Agent',
				type: 'ai_languageModel',
				index: 0,
			});
		});

		it('adds memory subnode with ai_memory connection', () => {
			const nodes = new Map<string, GraphNode>();
			const memorySubnode = createSubnode({ name: 'Buffer Memory', type: 'memoryBufferWindow' });
			const agentNode = createNode({
				name: 'Agent',
				config: {
					subnodes: {
						memory: memorySubnode,
					},
				} as unknown as NodeInstance<string, string, unknown>['config'],
			});

			addNodeWithSubnodes(nodes, agentNode);

			expect(nodes.has('Buffer Memory')).toBe(true);
			const memoryGraphNode = nodes.get('Buffer Memory');
			const aiConns = memoryGraphNode?.connections.get('ai_memory');
			expect(aiConns?.get(0)).toContainEqual({
				node: 'Agent',
				type: 'ai_memory',
				index: 0,
			});
		});

		it('adds tool subnodes with ai_tool connections', () => {
			const nodes = new Map<string, GraphNode>();
			const tool1 = createSubnode({ name: 'Calculator', type: 'toolCalculator' });
			const tool2 = createSubnode({ name: 'Wikipedia', type: 'toolWikipedia' });
			const agentNode = createNode({
				name: 'Agent',
				config: {
					subnodes: {
						tools: [tool1, tool2],
					},
				} as unknown as NodeInstance<string, string, unknown>['config'],
			});

			addNodeWithSubnodes(nodes, agentNode);

			expect(nodes.has('Calculator')).toBe(true);
			expect(nodes.has('Wikipedia')).toBe(true);

			const calcConns = nodes.get('Calculator')?.connections.get('ai_tool');
			expect(calcConns?.get(0)).toContainEqual({
				node: 'Agent',
				type: 'ai_tool',
				index: 0,
			});
		});

		it('adds vectorStore subnode with ai_vectorStore connection', () => {
			const nodes = new Map<string, GraphNode>();
			const vectorStore = createSubnode({ name: 'Pinecone', type: 'vectorStorePinecone' });
			const retrieverNode = createNode({
				name: 'Retriever',
				config: {
					subnodes: {
						vectorStore,
					},
				} as unknown as NodeInstance<string, string, unknown>['config'],
			});

			addNodeWithSubnodes(nodes, retrieverNode);

			expect(nodes.has('Pinecone')).toBe(true);
			const vsConns = nodes.get('Pinecone')?.connections.get('ai_vectorStore');
			expect(vsConns?.get(0)).toContainEqual({
				node: 'Retriever',
				type: 'ai_vectorStore',
				index: 0,
			});
		});

		it('handles embedding subnode (singular key)', () => {
			const nodes = new Map<string, GraphNode>();
			const embedding = createSubnode({ name: 'OpenAI Embeddings', type: 'embeddingsOpenAi' });
			const vectorStore = createNode({
				name: 'Vector Store',
				config: {
					subnodes: {
						embedding,
					},
				} as unknown as NodeInstance<string, string, unknown>['config'],
			});

			addNodeWithSubnodes(nodes, vectorStore);

			expect(nodes.has('OpenAI Embeddings')).toBe(true);
			const embConns = nodes.get('OpenAI Embeddings')?.connections.get('ai_embedding');
			expect(embConns?.get(0)).toContainEqual({
				node: 'Vector Store',
				type: 'ai_embedding',
				index: 0,
			});
		});

		it('handles embeddings subnode (plural key)', () => {
			const nodes = new Map<string, GraphNode>();
			const embedding = createSubnode({ name: 'OpenAI Embeddings', type: 'embeddingsOpenAi' });
			const vectorStore = createNode({
				name: 'Vector Store',
				config: {
					subnodes: {
						embeddings: embedding,
					},
				} as unknown as NodeInstance<string, string, unknown>['config'],
			});

			addNodeWithSubnodes(nodes, vectorStore);

			expect(nodes.has('OpenAI Embeddings')).toBe(true);
		});

		it('merges AI connection when subnode already exists', () => {
			const nodes = new Map<string, GraphNode>();
			const modelSubnode = createSubnode({ name: 'Shared Model', type: 'lmChatOpenAi' });

			// First agent adds the model
			const agent1 = createNode({
				name: 'Agent 1',
				config: { subnodes: { model: modelSubnode } } as unknown as NodeInstance<
					string,
					string,
					unknown
				>['config'],
			});
			addNodeWithSubnodes(nodes, agent1);

			// Second agent shares the same model
			const agent2 = createNode({
				name: 'Agent 2',
				config: { subnodes: { model: modelSubnode } } as unknown as NodeInstance<
					string,
					string,
					unknown
				>['config'],
			});
			addNodeWithSubnodes(nodes, agent2);

			// Model should have connections to both agents
			const modelConns = nodes.get('Shared Model')?.connections.get('ai_languageModel');
			const connections = modelConns?.get(0) ?? [];
			expect(connections).toContainEqual({ node: 'Agent 1', type: 'ai_languageModel', index: 0 });
			expect(connections).toContainEqual({ node: 'Agent 2', type: 'ai_languageModel', index: 0 });
		});
	});

	describe('duplicate parent names with shared subnodes', () => {
		it('processes subnodes for auto-renamed nodes', () => {
			const nodes = new Map<string, GraphNode>();
			const sharedModel = createSubnode({ name: 'Shared Model', type: 'lmChatOpenAi' });

			// Two agents with IDENTICAL names, sharing the same model
			const agent1 = createNode({
				name: 'Agent',
				config: { subnodes: { model: sharedModel } } as unknown as NodeInstance<
					string,
					string,
					unknown
				>['config'],
			});
			const agent2 = createNode({
				name: 'Agent',
				config: { subnodes: { model: sharedModel } } as unknown as NodeInstance<
					string,
					string,
					unknown
				>['config'],
			});

			const key1 = addNodeWithSubnodes(nodes, agent1);
			const key2 = addNodeWithSubnodes(nodes, agent2);

			// First agent keeps its name, second gets renamed
			expect(key1).toBe('Agent');
			expect(key2).toBe('Agent 1');

			// Shared model should exist and connect to BOTH agents using their map keys
			const modelConns = nodes.get('Shared Model')?.connections.get('ai_languageModel');
			const connections = modelConns?.get(0) ?? [];
			expect(connections).toContainEqual({
				node: 'Agent',
				type: 'ai_languageModel',
				index: 0,
			});
			expect(connections).toContainEqual({
				node: 'Agent 1',
				type: 'ai_languageModel',
				index: 0,
			});
		});
	});

	describe('plain object subnodes (no top-level .name)', () => {
		it('derives name from config.name for plain object subnodes', () => {
			const nodes = new Map<string, GraphNode>();
			// Plain object subnode without top-level .name, simulating inline subnode definition
			const plainDocLoader = {
				type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
				version: '1.1',
				config: {
					name: 'Load My Company Data',
					parameters: {},
				},
			} as unknown as NodeInstance<string, string, unknown>;

			const vectorStore = createNode({
				name: 'Store Data',
				type: 'vectorStorePinecone',
				config: {
					subnodes: {
						documentLoader: plainDocLoader,
					},
				} as unknown as NodeInstance<string, string, unknown>['config'],
			});

			addNodeWithSubnodes(nodes, vectorStore);

			// Should NOT have an undefined key in the map
			expect(nodes.has(undefined as unknown as string)).toBe(false);
			// Should use config.name as the key
			expect(nodes.has('Load My Company Data')).toBe(true);
			// Should have the correct AI connection
			const docConns = nodes.get('Load My Company Data')?.connections.get('ai_document');
			expect(docConns?.get(0)).toContainEqual({
				node: 'Store Data',
				type: 'ai_document',
				index: 0,
			});
		});

		it('derives name from config.name for nested plain object subnodes', () => {
			const nodes = new Map<string, GraphNode>();
			// Plain object embedding nested inside a tool subnode
			const plainEmbedding = {
				type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
				version: '1.2',
				config: {
					name: 'OpenAI Embeddings',
					parameters: { model: 'text-embedding-3-small' },
				},
			} as unknown as NodeInstance<string, string, unknown>;

			const toolSubnode = createSubnode({
				name: 'RAG Tool',
				type: 'vectorStorePinecone',
				config: {
					subnodes: {
						embedding: plainEmbedding,
					},
				} as unknown as NodeInstance<string, string, unknown>['config'],
			});

			const agentNode = createNode({
				name: 'Agent',
				config: {
					subnodes: {
						tools: [toolSubnode],
					},
				} as unknown as NodeInstance<string, string, unknown>['config'],
			});

			addNodeWithSubnodes(nodes, agentNode);

			// Should NOT have an undefined key
			expect(nodes.has(undefined as unknown as string)).toBe(false);
			// Nested plain object embedding should use config.name
			expect(nodes.has('OpenAI Embeddings')).toBe(true);
		});
	});

	describe('nested subnodes', () => {
		it('processes nested subnodes recursively', () => {
			const nodes = new Map<string, GraphNode>();
			const embedding = createSubnode({ name: 'Embedding', type: 'embeddingsOpenAi' });
			const vectorStore = createSubnode({
				name: 'Vector Store',
				type: 'vectorStorePinecone',
				config: {
					subnodes: {
						embedding,
					},
				} as unknown as NodeInstance<string, string, unknown>['config'],
			});
			const retrieverNode = createNode({
				name: 'Retriever',
				config: {
					subnodes: {
						vectorStore,
					},
				} as unknown as NodeInstance<string, string, unknown>['config'],
			});

			addNodeWithSubnodes(nodes, retrieverNode);

			// All three nodes should be in the map
			expect(nodes.has('Retriever')).toBe(true);
			expect(nodes.has('Vector Store')).toBe(true);
			expect(nodes.has('Embedding')).toBe(true);

			// Vector Store -> Retriever connection
			const vsConns = nodes.get('Vector Store')?.connections.get('ai_vectorStore');
			expect(vsConns?.get(0)).toContainEqual({
				node: 'Retriever',
				type: 'ai_vectorStore',
				index: 0,
			});

			// Embedding -> Vector Store connection
			const embConns = nodes.get('Embedding')?.connections.get('ai_embedding');
			expect(embConns?.get(0)).toContainEqual({
				node: 'Vector Store',
				type: 'ai_embedding',
				index: 0,
			});
		});
	});
});
