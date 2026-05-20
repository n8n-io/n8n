jest.mock('@n8n/instance-ai', () => ({
	createEvalAgent: jest.fn(),
	extractText: jest.fn(),
}));

jest.mock('../node-config', () => ({
	extractNodeConfig: jest.fn(),
}));

import { createEvalAgent, extractText } from '@n8n/instance-ai';
import type { IConnections, INode, INodeParameters, IWorkflowBase } from 'n8n-workflow';

import {
	assertUnpinCompatibility,
	buildVendorLlmRouting,
	generateMockHints,
	identifyNodesForHints,
	identifyNodesForPinData,
} from '../workflow-analysis';
import { UserError } from 'n8n-workflow';

const mockedCreateEvalAgent = jest.mocked(createEvalAgent);
const mockedExtractText = jest.mocked(extractText);

function makeNode(overrides: Partial<INode> & { name: string; type: string }): INode {
	return {
		id: overrides.name,
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
		...overrides,
	};
}

function makeWorkflow(nodes: INode[], connections: IConnections = {}): IWorkflowBase {
	return {
		id: 'test-workflow',
		name: 'Test',
		active: false,
		isArchived: false,
		activeVersionId: null,
		nodes,
		connections,
		createdAt: new Date(),
		updatedAt: new Date(),
	};
}

describe('identifyNodesForPinData', () => {
	it('should identify AI root nodes as needing pin data', () => {
		const nodes = [
			makeNode({ name: 'ChatOpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
			makeNode({ name: 'Set', type: 'n8n-nodes-base.set' }),
		];
		const connections: IConnections = {
			ChatOpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
		};

		const result = identifyNodesForPinData(makeWorkflow(nodes, connections));
		const names = result.map((n) => n.name);

		expect(names).toContain('Agent');
		expect(names).not.toContain('ChatOpenAI');
		expect(names).not.toContain('Set');
	});

	it('should identify protocol/bypass nodes as needing pin data', () => {
		const nodes = [
			makeNode({ name: 'My Redis', type: 'n8n-nodes-base.redis' }),
			makeNode({ name: 'My Postgres', type: 'n8n-nodes-base.postgres' }),
			makeNode({ name: 'My Kafka', type: 'n8n-nodes-base.kafka' }),
			makeNode({ name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' }),
			makeNode({ name: 'Set', type: 'n8n-nodes-base.set' }),
		];

		const result = identifyNodesForPinData(makeWorkflow(nodes));
		const names = result.map((n) => n.name);

		expect(names).toContain('My Redis');
		expect(names).toContain('My Postgres');
		expect(names).toContain('My Kafka');
		expect(names).not.toContain('HTTP Request');
		expect(names).not.toContain('Set');
	});

	it('should exclude disabled nodes', () => {
		const nodes = [
			makeNode({ name: 'My Redis', type: 'n8n-nodes-base.redis', disabled: true }),
			makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent', disabled: true }),
		];
		const connections: IConnections = {
			ChatOpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
		};

		const result = identifyNodesForPinData(makeWorkflow(nodes, connections));

		expect(result).toHaveLength(0);
	});

	it('should return empty for workflow with only logic nodes', () => {
		const nodes = [
			makeNode({ name: 'Set', type: 'n8n-nodes-base.set' }),
			makeNode({ name: 'IF', type: 'n8n-nodes-base.if' }),
			makeNode({ name: 'Merge', type: 'n8n-nodes-base.merge' }),
		];

		const result = identifyNodesForPinData(makeWorkflow(nodes));

		expect(result).toHaveLength(0);
	});

	it('should handle Agent with multiple sub-nodes', () => {
		const nodes = [
			makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'Memory', type: '@n8n/n8n-nodes-langchain.memoryBufferWindow' }),
			makeNode({ name: 'Calculator', type: '@n8n/n8n-nodes-langchain.toolCalculator' }),
			makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
		];
		const connections: IConnections = {
			OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
			Memory: { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
			Calculator: { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
		};

		const result = identifyNodesForPinData(makeWorkflow(nodes, connections));
		const names = result.map((n) => n.name);

		expect(names).toEqual(['Agent']);
	});

	it('should identify all bypass node types', () => {
		const bypassTypes = [
			'n8n-nodes-base.redis',
			'n8n-nodes-base.mongoDb',
			'n8n-nodes-base.mySql',
			'n8n-nodes-base.postgres',
			'n8n-nodes-base.microsoftSql',
			'n8n-nodes-base.snowflake',
			'n8n-nodes-base.kafka',
			'n8n-nodes-base.rabbitmq',
			'n8n-nodes-base.mqtt',
			'n8n-nodes-base.amqp',
			'n8n-nodes-base.ftp',
			'n8n-nodes-base.ssh',
			'n8n-nodes-base.ldap',
			'n8n-nodes-base.emailSend',
			'n8n-nodes-base.rssFeedRead',
			'n8n-nodes-base.git',
		];

		const nodes = bypassTypes.map((type, i) => makeNode({ name: `Node${i}`, type }));
		const result = identifyNodesForPinData(makeWorkflow(nodes));

		expect(result).toHaveLength(bypassTypes.length);
	});

	describe('exclusionSet', () => {
		const agentNodes = [
			makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
		];
		const agentConnections: IConnections = {
			OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
		};

		it('treats an empty exclusion set the same as omitting it', () => {
			const result = identifyNodesForPinData(makeWorkflow(agentNodes, agentConnections), new Set());
			expect(result.map((n) => n.name)).toEqual(['Agent']);
		});

		it('ignores names not present in the workflow', () => {
			const result = identifyNodesForPinData(
				makeWorkflow(agentNodes, agentConnections),
				new Set(['NotAWorkflowNode']),
			);
			expect(result.map((n) => n.name)).toEqual(['Agent']);
		});

		it('ignores names not in the pin set (regular logic nodes)', () => {
			const nodes = [...agentNodes, makeNode({ name: 'Set', type: 'n8n-nodes-base.set' })];
			const result = identifyNodesForPinData(
				makeWorkflow(nodes, agentConnections),
				new Set(['Set']),
			);
			expect(result.map((n) => n.name)).toEqual(['Agent']);
		});

		it('drops AI root names from the pin set', () => {
			const result = identifyNodesForPinData(
				makeWorkflow(agentNodes, agentConnections),
				new Set(['Agent']),
			);
			expect(result.map((n) => n.name)).toEqual([]);
		});

		it('keeps protocol-binary bypass nodes pinned even when present in the exclusion set', () => {
			const nodes = [...agentNodes, makeNode({ name: 'Cache', type: 'n8n-nodes-base.redis' })];
			const result = identifyNodesForPinData(
				makeWorkflow(nodes, agentConnections),
				new Set(['Agent', 'Cache']),
			);
			expect(result.map((n) => n.name)).toEqual(['Cache']);
		});
	});
});

describe('assertUnpinCompatibility', () => {
	function agentWithMemory(memoryType: string) {
		const nodes = [
			makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'Memory', type: memoryType }),
			makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
		];
		const connections: IConnections = {
			OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
			Memory: { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
		};
		return makeWorkflow(nodes, connections);
	}

	it('is a no-op when unpinNodes is empty', () => {
		const workflow = agentWithMemory('@n8n/n8n-nodes-langchain.memoryPostgresChat');
		expect(() => assertUnpinCompatibility(workflow, [])).not.toThrow();
	});

	it('allows unpinning an Agent backed by MemoryBufferWindow', () => {
		const workflow = agentWithMemory('@n8n/n8n-nodes-langchain.memoryBufferWindow');
		expect(() => assertUnpinCompatibility(workflow, ['Agent'])).not.toThrow();
	});

	it('allows unpinning an Agent with no sub-nodes attached', () => {
		const nodes = [makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' })];
		expect(() => assertUnpinCompatibility(makeWorkflow(nodes), ['Agent'])).not.toThrow();
	});

	it('ignores disabled sub-nodes when checking compatibility', () => {
		const nodes = [
			makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({
				name: 'PgMem',
				type: '@n8n/n8n-nodes-langchain.memoryPostgresChat',
				disabled: true,
			}),
			makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
		];
		const connections: IConnections = {
			OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
			PgMem: { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
		};
		expect(() =>
			assertUnpinCompatibility(makeWorkflow(nodes, connections), ['Agent']),
		).not.toThrow();
	});

	it('ignores roots that do not exist in the workflow', () => {
		const workflow = agentWithMemory('@n8n/n8n-nodes-langchain.memoryBufferWindow');
		expect(() => assertUnpinCompatibility(workflow, ['Ghost'])).not.toThrow();
	});

	it('ignores disabled roots even when their sub-nodes would otherwise be refused', () => {
		const nodes = [
			makeNode({ name: 'PgMem', type: '@n8n/n8n-nodes-langchain.memoryPostgresChat' }),
			makeNode({
				name: 'Agent',
				type: '@n8n/n8n-nodes-langchain.agent',
				disabled: true,
			}),
		];
		const connections: IConnections = {
			PgMem: { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
		};
		expect(() =>
			assertUnpinCompatibility(makeWorkflow(nodes, connections), ['Agent']),
		).not.toThrow();
	});

	it.each([
		['Postgres memory', '@n8n/n8n-nodes-langchain.memoryPostgresChat'],
		['Redis memory', '@n8n/n8n-nodes-langchain.memoryRedisChat'],
		['MongoDB memory', '@n8n/n8n-nodes-langchain.memoryMongoDbChat'],
	])('refuses unpinning an Agent backed by %s', (_label, memoryType) => {
		const workflow = agentWithMemory(memoryType);
		expect(() => assertUnpinCompatibility(workflow, ['Agent'])).toThrow(UserError);
	});

	it.each([
		'@n8n/n8n-nodes-langchain.vectorStorePGVector',
		'@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas',
		'@n8n/n8n-nodes-langchain.vectorStoreRedis',
		'@n8n/n8n-nodes-langchain.vectorStoreMilvus',
		'@n8n/n8n-nodes-langchain.chatHubVectorStorePGVector',
	])('refuses unpinning an Agent backed by protocol-binary vector store %s', (vectorStoreType) => {
		const nodes = [
			makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'Store', type: vectorStoreType }),
			makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
		];
		const connections: IConnections = {
			OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
			Store: { ai_vectorStore: [[{ node: 'Agent', type: 'ai_vectorStore', index: 0 }]] },
		};
		expect(() => assertUnpinCompatibility(makeWorkflow(nodes, connections), ['Agent'])).toThrow(
			UserError,
		);
	});

	it('reports all offending roots when multiple unpin targets are mixed', () => {
		const nodes = [
			makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'PgMem', type: '@n8n/n8n-nodes-langchain.memoryPostgresChat' }),
			makeNode({ name: 'BufMem', type: '@n8n/n8n-nodes-langchain.memoryBufferWindow' }),
			makeNode({ name: 'AgentA', type: '@n8n/n8n-nodes-langchain.agent' }),
			makeNode({ name: 'AgentB', type: '@n8n/n8n-nodes-langchain.agent' }),
		];
		const connections: IConnections = {
			OpenAI: { ai_languageModel: [[{ node: 'AgentB', type: 'ai_languageModel', index: 0 }]] },
			PgMem: { ai_memory: [[{ node: 'AgentA', type: 'ai_memory', index: 0 }]] },
			BufMem: { ai_memory: [[{ node: 'AgentB', type: 'ai_memory', index: 0 }]] },
		};

		let thrown: unknown;
		try {
			assertUnpinCompatibility(makeWorkflow(nodes, connections), ['AgentA', 'AgentB']);
		} catch (e) {
			thrown = e;
		}

		expect(thrown).toBeInstanceOf(UserError);
		const message = (thrown as UserError).message;
		expect(message).toContain('AgentA');
		expect(message).toContain('PgMem');
		expect(message).not.toContain('AgentB');
		expect(message).not.toContain('BufMem');
	});

	describe('vendor LLM mapping', () => {
		function agentWithLlm(llmType: string) {
			const nodes = [
				makeNode({ name: 'Llm', type: llmType }),
				makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
			];
			const connections: IConnections = {
				Llm: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
			};
			return makeWorkflow(nodes, connections);
		}

		it('allows unpinning an Agent backed by lmChatOpenAi (the only mapped vendor for M1)', () => {
			const workflow = agentWithLlm('@n8n/n8n-nodes-langchain.lmChatOpenAi');
			expect(() => assertUnpinCompatibility(workflow, ['Agent'])).not.toThrow();
		});

		it.each([
			'@n8n/n8n-nodes-langchain.lmChatAnthropic',
			'@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
			'@n8n/n8n-nodes-langchain.lmChatCohere',
			'@n8n/n8n-nodes-langchain.lmChatGroq',
			'@n8n/n8n-nodes-langchain.lmChatMistralCloud',
			'@n8n/n8n-nodes-langchain.lmChatAzureOpenAi',
			'@n8n/n8n-nodes-langchain.lmChatOpenRouter',
			'@n8n/n8n-nodes-langchain.lmChatXAiGrok',
			'@n8n/n8n-nodes-langchain.lmChatDeepSeek',
			'@n8n/n8n-nodes-langchain.lmChatOllama',
			'@n8n/n8n-nodes-langchain.lmOpenAi',
		])('refuses unpinning an Agent backed by unmapped vendor LLM %s', (llmType) => {
			const workflow = agentWithLlm(llmType);

			let thrown: unknown;
			try {
				assertUnpinCompatibility(workflow, ['Agent']);
			} catch (e) {
				thrown = e;
			}

			expect(thrown).toBeInstanceOf(UserError);
			const message = (thrown as UserError).message;
			expect(message).toContain('unsupported vendor LLM');
			expect(message).toContain(llmType);
		});

		it('groups protocol-binary and unsupported-vendor refusals into the same error', () => {
			const nodes = [
				makeNode({ name: 'Anthropic', type: '@n8n/n8n-nodes-langchain.lmChatAnthropic' }),
				makeNode({ name: 'PgMem', type: '@n8n/n8n-nodes-langchain.memoryPostgresChat' }),
				makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
			];
			const connections: IConnections = {
				Anthropic: {
					ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]],
				},
				PgMem: { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
			};

			let thrown: unknown;
			try {
				assertUnpinCompatibility(makeWorkflow(nodes, connections), ['Agent']);
			} catch (e) {
				thrown = e;
			}

			expect(thrown).toBeInstanceOf(UserError);
			const message = (thrown as UserError).message;
			expect(message).toContain('protocol-binary');
			expect(message).toContain('PgMem');
			expect(message).toContain('unsupported vendor LLM');
			expect(message).toContain('Anthropic');
		});

		it('ignores disabled vendor LLM sub-nodes when checking compatibility', () => {
			const nodes = [
				makeNode({
					name: 'Anthropic',
					type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
					disabled: true,
				}),
				makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
			];
			const connections: IConnections = {
				Anthropic: {
					ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]],
				},
			};

			expect(() =>
				assertUnpinCompatibility(makeWorkflow(nodes, connections), ['Agent']),
			).not.toThrow();
		});

		describe('lmChatOpenAi options.baseURL override', () => {
			function agentWithOpenAi(parameters: INodeParameters) {
				const nodes = [
					makeNode({
						name: 'OpenAI',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						parameters,
					}),
					makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
				];
				const connections: IConnections = {
					OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
				};
				return makeWorkflow(nodes, connections);
			}

			it('allows lmChatOpenAi with no options', () => {
				const workflow = agentWithOpenAi({});
				expect(() => assertUnpinCompatibility(workflow, ['Agent'])).not.toThrow();
			});

			it('allows lmChatOpenAi with empty options.baseURL', () => {
				const workflow = agentWithOpenAi({ options: { baseURL: '' } });
				expect(() => assertUnpinCompatibility(workflow, ['Agent'])).not.toThrow();
			});

			it('allows lmChatOpenAi when options.baseURL is whitespace-only', () => {
				const workflow = agentWithOpenAi({ options: { baseURL: '   ' } });
				expect(() => assertUnpinCompatibility(workflow, ['Agent'])).not.toThrow();
			});

			it('refuses lmChatOpenAi when options.baseURL is set — credential rewrite would be bypassed', () => {
				const workflow = agentWithOpenAi({
					options: { baseURL: 'https://my-proxy.example.com/v1' },
				});

				let thrown: unknown;
				try {
					assertUnpinCompatibility(workflow, ['Agent']);
				} catch (e) {
					thrown = e;
				}

				expect(thrown).toBeInstanceOf(UserError);
				const message = (thrown as UserError).message;
				expect(message).toContain('options.baseURL');
				expect(message).toContain('"OpenAI"');
				expect(message).not.toContain('unsupported vendor LLM');
			});

			it('groups baseURL-override refusals alongside protocol-binary refusals', () => {
				const nodes = [
					makeNode({
						name: 'OpenAI',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						parameters: { options: { baseURL: 'https://my-proxy.example.com/v1' } },
					}),
					makeNode({
						name: 'PgMem',
						type: '@n8n/n8n-nodes-langchain.memoryPostgresChat',
					}),
					makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
				];
				const connections: IConnections = {
					OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
					PgMem: { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
				};

				let thrown: unknown;
				try {
					assertUnpinCompatibility(makeWorkflow(nodes, connections), ['Agent']);
				} catch (e) {
					thrown = e;
				}

				expect(thrown).toBeInstanceOf(UserError);
				const message = (thrown as UserError).message;
				expect(message).toContain('protocol-binary');
				expect(message).toContain('PgMem');
				expect(message).toContain('options.baseURL');
				expect(message).toContain('OpenAI');
			});

			it('skips the baseURL check when the OpenAI sub-node is disabled', () => {
				const nodes = [
					makeNode({
						name: 'OpenAI',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						parameters: { options: { baseURL: 'https://my-proxy.example.com/v1' } },
						disabled: true,
					}),
					makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
				];
				const connections: IConnections = {
					OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
				};

				expect(() =>
					assertUnpinCompatibility(makeWorkflow(nodes, connections), ['Agent']),
				).not.toThrow();
			});
		});
	});
});

describe('buildVendorLlmRouting', () => {
	it('returns empty maps when unpinNodes is empty', () => {
		const nodes = [
			makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
		];
		const connections: IConnections = {
			OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
		};

		const routing = buildVendorLlmRouting(makeWorkflow(nodes, connections), []);

		expect(routing.subNodeToRoot.size).toBe(0);
		expect(routing.rootToSubNode.size).toBe(0);
	});

	it('maps a chat-model sub-node to its unpinned root and vice versa', () => {
		const nodes = [
			makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
		];
		const connections: IConnections = {
			OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
		};

		const routing = buildVendorLlmRouting(makeWorkflow(nodes, connections), ['Agent']);

		expect(routing.subNodeToRoot.get('OpenAI')).toBe('Agent');
		expect(routing.rootToSubNode.get('Agent')?.name).toBe('OpenAI');
	});

	it('does not include sub-nodes feeding roots that are still pinned', () => {
		const nodes = [
			makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'PinnedAgent', type: '@n8n/n8n-nodes-langchain.agent' }),
		];
		const connections: IConnections = {
			OpenAI: {
				ai_languageModel: [[{ node: 'PinnedAgent', type: 'ai_languageModel', index: 0 }]],
			},
		};

		// `unpinNodes` does not include PinnedAgent — its sub-nodes never reach the
		// wire server, so the routing map stays empty.
		const routing = buildVendorLlmRouting(makeWorkflow(nodes, connections), ['SomeOther']);

		expect(routing.subNodeToRoot.size).toBe(0);
		expect(routing.rootToSubNode.size).toBe(0);
	});

	it('ignores disabled sub-nodes', () => {
		const nodes = [
			makeNode({
				name: 'OpenAI',
				type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				disabled: true,
			}),
			makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
		];
		const connections: IConnections = {
			OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
		};

		const routing = buildVendorLlmRouting(makeWorkflow(nodes, connections), ['Agent']);

		expect(routing.subNodeToRoot.size).toBe(0);
		expect(routing.rootToSubNode.size).toBe(0);
	});

	it('skips non-LLM ai_* connections (memory, tools, vector stores)', () => {
		const nodes = [
			makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'Memory', type: '@n8n/n8n-nodes-langchain.memoryBufferWindow' }),
			makeNode({ name: 'Calculator', type: '@n8n/n8n-nodes-langchain.toolCalculator' }),
			makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
		];
		const connections: IConnections = {
			OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
			Memory: { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
			Calculator: { ai_tool: [[{ node: 'Agent', type: 'ai_tool', index: 0 }]] },
		};

		const routing = buildVendorLlmRouting(makeWorkflow(nodes, connections), ['Agent']);

		expect(Array.from(routing.subNodeToRoot.keys())).toEqual(['OpenAI']);
		expect(Array.from(routing.rootToSubNode.keys())).toEqual(['Agent']);
	});

	it('skips unsupported vendor LLM sub-nodes (Anthropic, Gemini, etc.)', () => {
		// `assertUnpinCompatibility` would have already refused this; the filter
		// here is defence in depth so the helper never embeds a root whose
		// sub-node lacks an interception path.
		const nodes = [
			makeNode({ name: 'Anthropic', type: '@n8n/n8n-nodes-langchain.lmChatAnthropic' }),
			makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
		];
		const connections: IConnections = {
			Anthropic: {
				ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]],
			},
		};

		const routing = buildVendorLlmRouting(makeWorkflow(nodes, connections), ['Agent']);

		expect(routing.subNodeToRoot.size).toBe(0);
		expect(routing.rootToSubNode.size).toBe(0);
	});

	it('first-wins when a single sub-node feeds multiple unpinned roots (documented limitation)', () => {
		// Documented in the buildVendorLlmRouting doc-comment. n8n's UI doesn't
		// usually encourage shared chat-model sub-nodes, but the data model
		// allows it. Until `assertUnpinCompatibility` refuses this topology, the
		// first root to appear in `unpinNodes` wins the sub-node mapping — the
		// other root's interceptedRequests ledger will be empty for those turns.
		const nodes = [
			makeNode({ name: 'Shared OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'Agent A', type: '@n8n/n8n-nodes-langchain.agent' }),
			makeNode({ name: 'Agent B', type: '@n8n/n8n-nodes-langchain.agent' }),
		];
		const connections: IConnections = {
			'Shared OpenAI': {
				ai_languageModel: [
					[
						{ node: 'Agent A', type: 'ai_languageModel', index: 0 },
						{ node: 'Agent B', type: 'ai_languageModel', index: 0 },
					],
				],
			},
		};

		const routing = buildVendorLlmRouting(makeWorkflow(nodes, connections), ['Agent A', 'Agent B']);

		// Sub-node maps to whichever root appears first in unpinNodes.
		expect(routing.subNodeToRoot.get('Shared OpenAI')).toBe('Agent A');
		// Both roots get the sub-node back from rootToSubNode (used by the wire
		// server to find the mock-handler node context), but credential
		// rewrites attribute everything to Agent A.
		expect(routing.rootToSubNode.get('Agent A')?.name).toBe('Shared OpenAI');
		expect(routing.rootToSubNode.get('Agent B')?.name).toBe('Shared OpenAI');
	});

	it('handles multiple unpinned roots independently', () => {
		const nodes = [
			makeNode({ name: 'OpenAI A', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'OpenAI B', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'Agent A', type: '@n8n/n8n-nodes-langchain.agent' }),
			makeNode({ name: 'Agent B', type: '@n8n/n8n-nodes-langchain.agent' }),
		];
		const connections: IConnections = {
			'OpenAI A': {
				ai_languageModel: [[{ node: 'Agent A', type: 'ai_languageModel', index: 0 }]],
			},
			'OpenAI B': {
				ai_languageModel: [[{ node: 'Agent B', type: 'ai_languageModel', index: 0 }]],
			},
		};

		const routing = buildVendorLlmRouting(makeWorkflow(nodes, connections), ['Agent A', 'Agent B']);

		expect(routing.subNodeToRoot.get('OpenAI A')).toBe('Agent A');
		expect(routing.subNodeToRoot.get('OpenAI B')).toBe('Agent B');
		expect(routing.rootToSubNode.get('Agent A')?.name).toBe('OpenAI A');
		expect(routing.rootToSubNode.get('Agent B')?.name).toBe('OpenAI B');
	});
});

describe('identifyNodesForHints', () => {
	it('should exclude AI sub-nodes from hints', () => {
		const nodes = [
			makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
			makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack' }),
		];
		const connections: IConnections = {
			OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
		};

		const result = identifyNodesForHints(makeWorkflow(nodes, connections));
		const names = result.map((n) => n.name);

		expect(names).not.toContain('OpenAI');
		expect(names).not.toContain('Agent');
		expect(names).toContain('Slack');
	});

	it('should exclude pinned bypass nodes from hints', () => {
		const nodes = [
			makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			makeNode({ name: 'Redis', type: 'n8n-nodes-base.redis' }),
			makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack' }),
			makeNode({ name: 'Set', type: 'n8n-nodes-base.set' }),
		];

		const result = identifyNodesForHints(makeWorkflow(nodes));
		const names = result.map((n) => n.name);

		expect(names).not.toContain('Redis');
		expect(names).toContain('Webhook');
		expect(names).toContain('Slack');
		expect(names).toContain('Set');
	});

	it('should exclude disabled nodes', () => {
		const nodes = [
			makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack', disabled: true }),
			makeNode({ name: 'Gmail', type: 'n8n-nodes-base.gmail' }),
		];

		const result = identifyNodesForHints(makeWorkflow(nodes));
		const names = result.map((n) => n.name);

		expect(names).not.toContain('Slack');
		expect(names).toContain('Gmail');
	});

	it('should return only HTTP-interceptible nodes for a mixed workflow', () => {
		const nodes = [
			makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
			makeNode({ name: 'Postgres', type: 'n8n-nodes-base.postgres' }),
			makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack' }),
			makeNode({ name: 'Set', type: 'n8n-nodes-base.set' }),
		];
		const connections: IConnections = {
			OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
		};

		const result = identifyNodesForHints(makeWorkflow(nodes, connections));
		const names = result.map((n) => n.name);

		// Should include: Webhook (trigger, gets hints), Slack (HTTP service), Set (logic)
		expect(names).toContain('Webhook');
		expect(names).toContain('Slack');
		expect(names).toContain('Set');
		// Should exclude: OpenAI (AI sub-node), Agent (AI root, pinned), Postgres (bypass, pinned)
		expect(names).not.toContain('OpenAI');
		expect(names).not.toContain('Agent');
		expect(names).not.toContain('Postgres');
	});
});

describe('generateMockHints', () => {
	const workflow = makeWorkflow([
		makeNode({ name: 'Schedule', type: 'n8n-nodes-base.scheduleTrigger' }),
		makeNode({ name: 'Slack', type: 'n8n-nodes-base.slack' }),
	]);

	function mockAgentResponses(...responses: Array<string | Error>) {
		const generate = jest.fn();
		for (const r of responses) {
			if (r instanceof Error) generate.mockRejectedValueOnce(r);
			else generate.mockResolvedValueOnce({ __raw: r });
		}
		mockedCreateEvalAgent.mockReturnValue({ generate } as unknown as ReturnType<
			typeof createEvalAgent
		>);
		mockedExtractText.mockImplementation((result: unknown) => (result as { __raw: string }).__raw);
		return generate;
	}

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should succeed on the first attempt when the LLM returns a well-formed response', async () => {
		const generate = mockAgentResponses(
			JSON.stringify({
				globalContext: 'shared context',
				triggerContent: { timestamp: '2024-01-01T00:00:00Z' },
				nodeHints: { Slack: 'post a message' },
			}),
		);

		const result = await generateMockHints({ workflow, nodeNames: ['Schedule', 'Slack'] });

		expect(generate).toHaveBeenCalledTimes(1);
		expect(result.triggerContent).toEqual({ timestamp: '2024-01-01T00:00:00Z' });
		expect(result.warnings).toEqual([]);
	});

	it('should retry when the first attempt returns empty triggerContent, then succeed', async () => {
		const generate = mockAgentResponses(
			JSON.stringify({ globalContext: '', triggerContent: {}, nodeHints: { Slack: 'foo' } }),
			JSON.stringify({
				globalContext: '',
				triggerContent: { timestamp: '2024-01-01T00:00:00Z' },
				nodeHints: { Slack: 'foo' },
			}),
		);

		const result = await generateMockHints({ workflow, nodeNames: ['Schedule', 'Slack'] });

		expect(generate).toHaveBeenCalledTimes(2);
		expect(result.triggerContent).toEqual({ timestamp: '2024-01-01T00:00:00Z' });
		expect(result.warnings).toEqual([
			expect.stringContaining('Phase 1 attempt 1/2: empty triggerContent'),
		]);
	});

	it('should return emptyResult with both warnings when every attempt fails', async () => {
		const generate = mockAgentResponses(
			JSON.stringify({ globalContext: '', triggerContent: {}, nodeHints: { Slack: 'foo' } }),
			JSON.stringify({ globalContext: '', triggerContent: {}, nodeHints: { Slack: 'foo' } }),
		);

		const result = await generateMockHints({ workflow, nodeNames: ['Schedule', 'Slack'] });

		expect(generate).toHaveBeenCalledTimes(2);
		expect(result.triggerContent).toEqual({});
		expect(result.warnings).toEqual([
			expect.stringContaining('attempt 1/2'),
			expect.stringContaining('attempt 2/2'),
		]);
	});

	it('should retry when the first attempt throws, then succeed', async () => {
		const generate = mockAgentResponses(
			new Error('anthropic rate limit'),
			JSON.stringify({
				globalContext: '',
				triggerContent: { timestamp: '2024-01-01T00:00:00Z' },
				nodeHints: { Slack: 'foo' },
			}),
		);

		const result = await generateMockHints({ workflow, nodeNames: ['Schedule', 'Slack'] });

		expect(generate).toHaveBeenCalledTimes(2);
		expect(result.triggerContent).toEqual({ timestamp: '2024-01-01T00:00:00Z' });
		expect(result.warnings).toEqual([expect.stringContaining('anthropic rate limit')]);
	});

	it('should retry when the first attempt returns invalid nodeHints structure', async () => {
		const generate = mockAgentResponses(
			JSON.stringify({ globalContext: '', triggerContent: { a: 1 }, nodeHints: [] }),
			JSON.stringify({
				globalContext: '',
				triggerContent: { a: 1 },
				nodeHints: { Slack: 'foo' },
			}),
		);

		const result = await generateMockHints({ workflow, nodeNames: ['Schedule', 'Slack'] });

		expect(generate).toHaveBeenCalledTimes(2);
		expect(result.warnings).toEqual([expect.stringContaining('invalid nodeHints')]);
	});

	it('should not call the agent when there are no hint-eligible nodes', async () => {
		const generate = mockAgentResponses('should never be called');

		const result = await generateMockHints({ workflow, nodeNames: [] });

		expect(generate).not.toHaveBeenCalled();
		expect(result.triggerContent).toEqual({});
		expect(result.warnings).toEqual([]);
	});
});
