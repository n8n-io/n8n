/**
 * Tests for subnode factory functions
 *
 * Following TDD: These tests are written BEFORE the implementation.
 * Run with: pnpm test subnodes.test.ts
 */

import type { LanguageModelInstance } from '../types/base';

// =============================================================================
// Tests for Subnode Factory Functions
// =============================================================================

describe('subnode factories', () => {
	// Import the module - will fail until implemented
	let subnodeBuilders: typeof import('../subnode-builders');

	beforeAll(async () => {
		try {
			subnodeBuilders = await import('../subnode-builders');
		} catch {
			// Module doesn't exist yet - tests will fail as expected in TDD
		}
	});

	describe('languageModel()', () => {
		it('should create a LanguageModelInstance with correct marker', () => {
			const model = subnodeBuilders.languageModel({
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				version: 1.2,
				config: {
					parameters: { model: 'gpt-4' },
				},
			});

			expect(model._subnodeType).toBe('ai_languageModel');
			expect(model.type).toBe('@n8n/n8n-nodes-langchain.lmChatOpenAi');
			expect(model.version).toBe('1.2');
			expect(model.config.parameters).toEqual({ model: 'gpt-4' });
		});

		it('should preserve node config properties', () => {
			const model = subnodeBuilders.languageModel({
				type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
				version: 1,
				config: {
					parameters: { model: 'claude-3' },
					name: 'My Anthropic Model',
					credentials: {
						anthropicApi: { name: 'Anthropic Key', id: 'cred-123' },
					},
				},
			});

			expect(model.name).toBe('My Anthropic Model');
			expect(model.config.credentials).toEqual({
				anthropicApi: { name: 'Anthropic Key', id: 'cred-123' },
			});
		});

		it('should have update method that preserves marker', () => {
			const model = subnodeBuilders.languageModel({
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				version: 1,
				config: { parameters: { model: 'gpt-3.5' } },
			});

			const updated = model.update({
				parameters: { model: 'gpt-4' },
			});

			// The updated instance should still be a LanguageModelInstance
			expect((updated as LanguageModelInstance<string, string, unknown>)._subnodeType).toBe(
				'ai_languageModel',
			);
			expect(updated.config.parameters).toEqual({ model: 'gpt-4' });
		});
	});

	describe('memory()', () => {
		it('should create a MemoryInstance with correct marker', () => {
			const mem = subnodeBuilders.memory({
				type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
				version: 1.2,
				config: {
					parameters: { contextWindowLength: 5 },
				},
			});

			expect(mem._subnodeType).toBe('ai_memory');
			expect(mem.type).toBe('@n8n/n8n-nodes-langchain.memoryBufferWindow');
		});
	});

	describe('tool()', () => {
		it('should create a ToolInstance with correct marker', () => {
			const t = subnodeBuilders.tool({
				type: '@n8n/n8n-nodes-langchain.toolCode',
				version: 1.1,
				config: {
					parameters: { code: 'return "hello"' },
				},
			});

			expect(t._subnodeType).toBe('ai_tool');
			expect(t.type).toBe('@n8n/n8n-nodes-langchain.toolCode');
		});

		it('should work for http request tool', () => {
			const t = subnodeBuilders.tool({
				type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
				version: 1,
				config: {
					parameters: { url: 'https://api.example.com' },
				},
			});

			expect(t._subnodeType).toBe('ai_tool');
		});
	});

	describe('outputParser()', () => {
		it('should create an OutputParserInstance with correct marker', () => {
			const parser = subnodeBuilders.outputParser({
				type: '@n8n/n8n-nodes-langchain.outputParserStructured',
				version: 1,
				config: {
					parameters: { schemaType: 'manual' },
				},
			});

			expect(parser._subnodeType).toBe('ai_outputParser');
			expect(parser.type).toBe('@n8n/n8n-nodes-langchain.outputParserStructured');
		});
	});

	describe('embedding()', () => {
		it('should create an EmbeddingInstance with correct marker', () => {
			const emb = subnodeBuilders.embedding({
				type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
				version: 1,
				config: {
					parameters: { model: 'text-embedding-ada-002' },
				},
			});

			expect(emb._subnodeType).toBe('ai_embedding');
			expect(emb.type).toBe('@n8n/n8n-nodes-langchain.embeddingsOpenAi');
		});
	});

	describe('vectorStore()', () => {
		it('should create a VectorStoreInstance with correct marker', () => {
			const vs = subnodeBuilders.vectorStore({
				type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
				version: 1,
				config: {
					parameters: { indexName: 'my-index' },
				},
			});

			expect(vs._subnodeType).toBe('ai_vectorStore');
			expect(vs.type).toBe('@n8n/n8n-nodes-langchain.vectorStorePinecone');
		});
	});

	describe('retriever()', () => {
		it('should create a RetrieverInstance with correct marker', () => {
			const ret = subnodeBuilders.retriever({
				type: '@n8n/n8n-nodes-langchain.retrieverVectorStore',
				version: 1,
				config: {},
			});

			expect(ret._subnodeType).toBe('ai_retriever');
			expect(ret.type).toBe('@n8n/n8n-nodes-langchain.retrieverVectorStore');
		});
	});

	describe('documentLoader()', () => {
		it('should create a DocumentLoaderInstance with correct marker', () => {
			const loader = subnodeBuilders.documentLoader({
				type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
				version: 1,
				config: {},
			});

			expect(loader._subnodeType).toBe('ai_document');
			expect(loader.type).toBe('@n8n/n8n-nodes-langchain.documentDefaultDataLoader');
		});
	});

	describe('textSplitter()', () => {
		it('should create a TextSplitterInstance with correct marker', () => {
			const splitter = subnodeBuilders.textSplitter({
				type: '@n8n/n8n-nodes-langchain.textSplitterCharacterTextSplitter',
				version: 1,
				config: {
					parameters: { chunkSize: 1000 },
				},
			});

			expect(splitter._subnodeType).toBe('ai_textSplitter');
			expect(splitter.type).toBe('@n8n/n8n-nodes-langchain.textSplitterCharacterTextSplitter');
		});
	});
});

// =============================================================================
// Tests for SubnodeConfig Type Safety
// =============================================================================

describe('SubnodeConfig type safety', () => {
	let subnodeBuilders: typeof import('../subnode-builders');

	beforeAll(async () => {
		try {
			subnodeBuilders = await import('../subnode-builders');
		} catch {
			// Module doesn't exist yet
		}
	});

	it('should accept typed subnodes in SubnodeConfig', () => {
		const model = subnodeBuilders.languageModel({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1,
			config: {},
		});

		const memory = subnodeBuilders.memory({
			type: '@n8n/n8n-nodes-langchain.memoryBufferWindow',
			version: 1,
			config: {},
		});

		const tool1 = subnodeBuilders.tool({
			type: '@n8n/n8n-nodes-langchain.toolCode',
			version: 1,
			config: {},
		});

		const tool2 = subnodeBuilders.tool({
			type: '@n8n/n8n-nodes-langchain.toolCalculator',
			version: 1,
			config: {},
		});

		const parser = subnodeBuilders.outputParser({
			type: '@n8n/n8n-nodes-langchain.outputParserStructured',
			version: 1,
			config: {},
		});

		// This should type-check - each subnode goes in its correct slot
		const config = {
			model,
			memory,
			tools: [tool1, tool2],
			outputParser: parser,
		};

		expect(config.model._subnodeType).toBe('ai_languageModel');
		expect(config.memory._subnodeType).toBe('ai_memory');
		expect(config.tools).toHaveLength(2);
		expect(config.tools[0]._subnodeType).toBe('ai_tool');
		expect(config.outputParser._subnodeType).toBe('ai_outputParser');
	});
});

// =============================================================================
// Tests for Integration with node() function
// =============================================================================

describe('subnode integration with node builder', () => {
	let subnodeBuilders: typeof import('../subnode-builders');
	let nodeBuilders: typeof import('../node-builder');

	beforeAll(async () => {
		try {
			subnodeBuilders = await import('../subnode-builders');
			nodeBuilders = await import('../node-builder');
		} catch {
			// Modules don't exist yet
		}
	});

	it('should allow subnodes in node config', () => {
		const model = subnodeBuilders.languageModel({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1,
			config: { parameters: { model: 'gpt-4' } },
		});

		const agent = nodeBuilders.node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: { promptType: 'auto', text: 'Hello' },
				subnodes: {
					model,
				},
			},
		});

		expect(agent.type).toBe('@n8n/n8n-nodes-langchain.agent');
		expect(agent.config.subnodes?.model).toBeDefined();
		expect(
			(agent.config.subnodes?.model as LanguageModelInstance<string, string, unknown>)._subnodeType,
		).toBe('ai_languageModel');
	});

	it('should allow multiple tools in subnodes', () => {
		const tool1 = subnodeBuilders.tool({
			type: '@n8n/n8n-nodes-langchain.toolCode',
			version: 1,
			config: {},
		});
		const tool2 = subnodeBuilders.tool({
			type: '@n8n/n8n-nodes-langchain.toolCalculator',
			version: 1,
			config: {},
		});

		const agent = nodeBuilders.node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {},
				subnodes: {
					tools: [tool1, tool2],
				},
			},
		});

		expect(agent.config.subnodes?.tools).toHaveLength(2);
	});
});
