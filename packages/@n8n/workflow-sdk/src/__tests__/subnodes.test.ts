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

// =============================================================================
// Tests for tool() with $fromAI Support
// =============================================================================

describe('tool() with $fromAI support', () => {
	let subnodeBuilders: typeof import('../subnode-builders');

	beforeAll(async () => {
		try {
			subnodeBuilders = await import('../subnode-builders');
		} catch {
			// Module doesn't exist yet
		}
	});

	it('should support static config without fromAI', () => {
		const calc = subnodeBuilders.tool({
			type: '@n8n/n8n-nodes-langchain.toolCalculator',
			version: 1,
			config: { parameters: {} },
		});
		expect(calc.config.parameters).toEqual({});
		expect(calc._subnodeType).toBe('ai_tool');
	});

	it('should support config callback with fromAI', () => {
		const gmail = subnodeBuilders.tool({
			type: 'n8n-nodes-base.gmailTool',
			version: 1,
			config: ($) => ({
				parameters: {
					sendTo: $.fromAI('to'),
				},
			}),
		});
		expect(gmail.config.parameters?.sendTo).toMatch(/\$fromAI\('to'\)/);
		expect(gmail.config.parameters?.sendTo).toContain('/*n8n-auto-generated-fromAI-override*/');
	});

	it('should generate fromAI with description', () => {
		const t = subnodeBuilders.tool({
			type: 'n8n-nodes-base.gmailTool',
			version: 1,
			config: ($) => ({
				parameters: { subject: $.fromAI('subject', 'Email subject line') },
			}),
		});
		expect(t.config.parameters?.subject).toContain("'subject'");
		expect(t.config.parameters?.subject).toContain('Email subject line');
	});

	it('should generate fromAI with type', () => {
		const t = subnodeBuilders.tool({
			type: 'test.tool',
			version: 1,
			config: ($) => ({
				parameters: { count: $.fromAI('count', '', 'number') },
			}),
		});
		expect(t.config.parameters?.count).toContain("'number'");
	});

	it('should generate fromAI with default value', () => {
		const t = subnodeBuilders.tool({
			type: 'test.tool',
			version: 1,
			config: ($) => ({
				parameters: {
					count: $.fromAI('count', '', 'number', 10),
					enabled: $.fromAI('enabled', '', 'boolean', true),
				},
			}),
		});
		expect(t.config.parameters?.count).toContain('10');
		expect(t.config.parameters?.enabled).toContain('true');
	});

	it('should handle special characters in description', () => {
		const t = subnodeBuilders.tool({
			type: 'test.tool',
			version: 1,
			config: ($) => ({
				parameters: {
					msg: $.fromAI('msg', 'User\'s message with "quotes"'),
				},
			}),
		});
		// Should properly escape quotes
		expect(t.config.parameters?.msg).toBeDefined();
		expect(t.config.parameters?.msg).toContain('$fromAI');
	});

	it('should generate proper expression format', () => {
		const t = subnodeBuilders.tool({
			type: 'test.tool',
			version: 1,
			config: ($) => ({
				parameters: {
					email: $.fromAI('recipient_email'),
				},
			}),
		});
		const expr = t.config.parameters?.email as string;
		// Should start with ={{ and end with }}
		expect(expr).toMatch(/^=\{\{.*\}\}$/);
		// Should contain the marker
		expect(expr).toContain('/*n8n-auto-generated-fromAI-override*/');
		// Should contain the $fromAI call
		expect(expr).toContain("$fromAI('recipient_email')");
	});

	it('should handle multiple fromAI calls in same config', () => {
		const gmail = subnodeBuilders.tool({
			type: 'n8n-nodes-base.gmailTool',
			version: 1,
			config: ($) => ({
				parameters: {
					sendTo: $.fromAI('to', 'Recipient email'),
					subject: $.fromAI('subject', 'Email subject'),
					message: $.fromAI('body', 'Email content'),
				},
				credentials: { gmailOAuth2: { id: 'cred-123', name: 'Gmail' } },
			}),
		});

		expect(gmail.config.parameters?.sendTo).toContain("$fromAI('to'");
		expect(gmail.config.parameters?.subject).toContain("$fromAI('subject'");
		expect(gmail.config.parameters?.message).toContain("$fromAI('body'");
		expect(gmail.config.credentials).toEqual({ gmailOAuth2: { id: 'cred-123', name: 'Gmail' } });
	});

	it('should work with nested parameters', () => {
		const t = subnodeBuilders.tool({
			type: 'n8n-nodes-base.googleSheetsTool',
			version: 4.5,
			config: ($) => ({
				parameters: {
					operation: 'append',
					sheetName: $.fromAI('sheet', 'Name of the sheet'),
					columns: {
						value: {
							Name: $.fromAI('name', 'Person name'),
							Email: $.fromAI('email', 'Person email'),
						},
					},
				},
			}),
		});

		expect(t.config.parameters?.operation).toBe('append');
		expect(t.config.parameters?.sheetName).toContain("$fromAI('sheet'");
		const columns = t.config.parameters?.columns as { value: { Name: string; Email: string } };
		expect(columns.value.Name).toContain("$fromAI('name'");
		expect(columns.value.Email).toContain("$fromAI('email'");
	});

	it('should handle json type with object default value', () => {
		const t = subnodeBuilders.tool({
			type: 'test.tool',
			version: 1,
			config: ($) => ({
				parameters: {
					data: $.fromAI('payload', 'JSON payload', 'json', { key: 'value' }),
				},
			}),
		});
		expect(t.config.parameters?.data).toContain("'json'");
		expect(t.config.parameters?.data).toContain('{"key":"value"}');
	});
});
