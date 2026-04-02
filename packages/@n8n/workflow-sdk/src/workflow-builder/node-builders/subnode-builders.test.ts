/**
 * Tests for subnode factory functions
 *
 * Following TDD: These tests are written BEFORE the implementation.
 * Run with: pnpm test subnodes.test.ts
 */

import type * as NodeBuilderModule from './node-builder';
import type * as SubnodeBuildersModule from './subnode-builders';
import type { LanguageModelInstance } from '../../types/base';
import type * as WorkflowBuilderModule from '../../workflow-builder';

// =============================================================================
// Tests for Subnode Factory Functions
// =============================================================================

describe('subnode factories', () => {
	// Import the module - will fail until implemented
	let subnodeBuilders: typeof SubnodeBuildersModule;

	beforeAll(async () => {
		try {
			subnodeBuilders = await import('./subnode-builders');
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

	describe('embeddings()', () => {
		it('should be an alias for embedding()', () => {
			expect(subnodeBuilders.embeddings).toBe(subnodeBuilders.embedding);
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
	let subnodeBuilders: typeof SubnodeBuildersModule;

	beforeAll(async () => {
		try {
			subnodeBuilders = await import('./subnode-builders');
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
	let subnodeBuilders: typeof SubnodeBuildersModule;
	let nodeBuilders: typeof NodeBuilderModule;

	beforeAll(async () => {
		try {
			subnodeBuilders = await import('./subnode-builders');
			nodeBuilders = await import('./node-builder');
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
// Tests for tool() with fromAi() Support
// =============================================================================

describe('tool() with fromAi() support', () => {
	let subnodeBuilders: typeof SubnodeBuildersModule;

	beforeAll(async () => {
		try {
			subnodeBuilders = await import('./subnode-builders');
		} catch {
			// Module doesn't exist yet
		}
	});

	it('should support static config without fromAi', () => {
		const calc = subnodeBuilders.tool({
			type: '@n8n/n8n-nodes-langchain.toolCalculator',
			version: 1,
			config: { parameters: {} },
		});
		expect(calc.config.parameters).toEqual({});
		expect(calc._subnodeType).toBe('ai_tool');
	});

	it('should support fromAi function', () => {
		const gmail = subnodeBuilders.tool({
			type: 'n8n-nodes-base.gmailTool',
			version: 1,
			config: {
				parameters: {
					sendTo: subnodeBuilders.fromAi('to'),
				},
			},
		});
		expect(gmail.config.parameters?.sendTo).toMatch(/\$fromAI\('to'\)/);
		expect(gmail.config.parameters?.sendTo).toContain('/*n8n-auto-generated-fromAI-override*/');
	});

	it('should generate fromAi with description', () => {
		const t = subnodeBuilders.tool({
			type: 'n8n-nodes-base.gmailTool',
			version: 1,
			config: {
				parameters: { subject: subnodeBuilders.fromAi('subject', 'Email subject line') },
			},
		});
		expect(t.config.parameters?.subject).toContain("'subject'");
		expect(t.config.parameters?.subject).toContain('Email subject line');
	});

	it('should generate fromAi with type', () => {
		const t = subnodeBuilders.tool({
			type: 'test.tool',
			version: 1,
			config: {
				parameters: { count: subnodeBuilders.fromAi('count', '', 'number') },
			},
		});
		expect(t.config.parameters?.count).toContain("'number'");
	});

	it('should generate fromAi with default value', () => {
		const t = subnodeBuilders.tool({
			type: 'test.tool',
			version: 1,
			config: {
				parameters: {
					count: subnodeBuilders.fromAi('count', '', 'number', 10),
					enabled: subnodeBuilders.fromAi('enabled', '', 'boolean', true),
				},
			},
		});
		expect(t.config.parameters?.count).toContain('10');
		expect(t.config.parameters?.enabled).toContain('true');
	});

	it('should handle special characters in description', () => {
		const t = subnodeBuilders.tool({
			type: 'test.tool',
			version: 1,
			config: {
				parameters: {
					msg: subnodeBuilders.fromAi('msg', 'User\'s message with "quotes"'),
				},
			},
		});
		// Should properly escape quotes
		expect(t.config.parameters?.msg).toBeDefined();
		expect(t.config.parameters?.msg).toContain('$fromAI');
	});

	it('should generate proper expression format', () => {
		const t = subnodeBuilders.tool({
			type: 'test.tool',
			version: 1,
			config: {
				parameters: {
					email: subnodeBuilders.fromAi('recipient_email'),
				},
			},
		});
		const expr = t.config.parameters?.email as string;
		// Should start with ={{ and end with }}
		expect(expr).toMatch(/^=\{\{.*\}\}$/);
		// Should contain the marker
		expect(expr).toContain('/*n8n-auto-generated-fromAI-override*/');
		// Should contain the $fromAI call
		expect(expr).toContain("$fromAI('recipient_email')");
	});

	it('should handle multiple fromAi calls in same config', () => {
		const gmail = subnodeBuilders.tool({
			type: 'n8n-nodes-base.gmailTool',
			version: 1,
			config: {
				parameters: {
					sendTo: subnodeBuilders.fromAi('to', 'Recipient email'),
					subject: subnodeBuilders.fromAi('subject', 'Email subject'),
					message: subnodeBuilders.fromAi('body', 'Email content'),
				},
				credentials: { gmailOAuth2: { id: 'cred-123', name: 'Gmail' } },
			},
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
			config: {
				parameters: {
					operation: 'append',
					sheetName: subnodeBuilders.fromAi('sheet', 'Name of the sheet'),
					columns: {
						value: {
							Name: subnodeBuilders.fromAi('name', 'Person name'),
							Email: subnodeBuilders.fromAi('email', 'Person email'),
						},
					},
				},
			},
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
			config: {
				parameters: {
					data: subnodeBuilders.fromAi('payload', 'JSON payload', 'json', { key: 'value' }),
				},
			},
		});
		expect(t.config.parameters?.data).toContain("'json'");
		expect(t.config.parameters?.data).toContain('{"key":"value"}');
	});
});

// =============================================================================
// Tests for Subnode Reuse Across Multiple Parents
// =============================================================================

describe('subnode reuse across multiple parents', () => {
	let subnodeBuilders: typeof SubnodeBuildersModule;
	let nodeBuilders: typeof NodeBuilderModule;
	let workflowBuilders: typeof WorkflowBuilderModule;

	beforeAll(async () => {
		subnodeBuilders = await import('./subnode-builders');
		nodeBuilders = await import('./node-builder');
		workflowBuilders = await import('../../workflow-builder');
	});

	it('should connect same embedding to multiple parent nodes', () => {
		// Single embedding reused by two vector stores
		const sharedEmbedding = subnodeBuilders.embedding({
			type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi',
			version: 1.2,
			config: {
				name: 'Shared Embeddings',
				parameters: { model: 'text-embedding-3-small' },
			},
		});

		const vectorStore1 = nodeBuilders.node({
			type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
			version: 1.3,
			config: {
				name: 'Vector Store 1',
				parameters: { mode: 'insert' },
				subnodes: { embedding: sharedEmbedding },
			},
		});

		const vectorStore2 = nodeBuilders.node({
			type: '@n8n/n8n-nodes-langchain.vectorStorePinecone',
			version: 1.3,
			config: {
				name: 'Vector Store 2',
				parameters: { mode: 'retrieve-as-tool' },
				subnodes: { embedding: sharedEmbedding },
			},
		});

		const t = nodeBuilders.trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Start' },
		});
		const wf = workflowBuilders.workflow('test', 'Test').add(t.to([vectorStore1, vectorStore2]));
		const json = wf.toJSON();

		// The shared embedding should connect to BOTH vector stores
		const embeddingConnections = json.connections['Shared Embeddings']?.ai_embedding?.[0];
		expect(embeddingConnections).toHaveLength(2);
		expect(embeddingConnections!.map((c) => c.node).sort()).toEqual(
			['Vector Store 1', 'Vector Store 2'].sort(),
		);
	});

	it('should connect same language model to multiple agent nodes', () => {
		const sharedModel = subnodeBuilders.languageModel({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.3,
			config: {
				name: 'Shared Model',
				parameters: { model: { mode: 'list', value: 'gpt-4o-mini' } },
			},
		});

		const agent1 = nodeBuilders.node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 3.1,
			config: { name: 'Agent 1', parameters: {}, subnodes: { model: sharedModel } },
		});

		const agent2 = nodeBuilders.node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 3.1,
			config: { name: 'Agent 2', parameters: {}, subnodes: { model: sharedModel } },
		});

		const t = nodeBuilders.trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Start' },
		});
		const wf = workflowBuilders.workflow('test', 'Test').add(t.to(agent1).to(agent2));
		const json = wf.toJSON();

		// The shared model should connect to BOTH agents
		const modelConnections = json.connections['Shared Model']?.ai_languageModel?.[0];
		expect(modelConnections).toHaveLength(2);
		expect(modelConnections!.map((c) => c.node).sort()).toEqual(['Agent 1', 'Agent 2'].sort());
	});

	it('should connect same tool to multiple agent nodes', () => {
		const sharedTool = subnodeBuilders.tool({
			type: '@n8n/n8n-nodes-langchain.toolCalculator',
			version: 1,
			config: { name: 'Shared Calculator' },
		});

		const model1 = subnodeBuilders.languageModel({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.3,
			config: { name: 'Model 1', parameters: {} },
		});

		const model2 = subnodeBuilders.languageModel({
			type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
			version: 1.3,
			config: { name: 'Model 2', parameters: {} },
		});

		const agent1 = nodeBuilders.node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 3.1,
			config: {
				name: 'Agent 1',
				parameters: {},
				subnodes: { model: model1, tools: [sharedTool] },
			},
		});

		const agent2 = nodeBuilders.node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 3.1,
			config: {
				name: 'Agent 2',
				parameters: {},
				subnodes: { model: model2, tools: [sharedTool] },
			},
		});

		const t = nodeBuilders.trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { name: 'Start' },
		});
		const wf = workflowBuilders.workflow('test', 'Test').add(t.to([agent1, agent2]));
		const json = wf.toJSON();

		// The shared tool should connect to BOTH agents
		const toolConnections = json.connections['Shared Calculator']?.ai_tool?.[0];
		expect(toolConnections).toHaveLength(2);
		expect(toolConnections!.map((c) => c.node).sort()).toEqual(['Agent 1', 'Agent 2'].sort());
	});
});
