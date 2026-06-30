vi.mock('@n8n/instance-ai', () => ({
	createEvalAgent: vi.fn(),
	extractText: vi.fn(),
}));

vi.mock('../node-config', () => ({
	extractNodeConfig: vi.fn(),
}));

import { createEvalAgent, extractText } from '@n8n/instance-ai';
import type { IConnections, INode, INodeParameters, IWorkflowBase } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import {
	buildVendorLlmRouting,
	detectBinaryDependencies,
	generateMockHints,
	identifyNodesForHints,
	identifyNodesForPinData,
	partitionAiRoots,
} from '../workflow-analysis';

const mockedCreateEvalAgent = vi.mocked(createEvalAgent);
const mockedExtractText = vi.mocked(extractText);

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

describe('partitionAiRoots', () => {
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

	describe('explicit pin validation (typo guard)', () => {
		it('throws when an explicit pin name does not exist in the workflow', () => {
			const workflow = agentWithMemory('@n8n/n8n-nodes-langchain.memoryBufferWindow');
			let thrown: unknown;
			try {
				partitionAiRoots(workflow, ['Ghost']);
			} catch (e) {
				thrown = e;
			}
			expect(thrown).toBeInstanceOf(UserError);
			expect((thrown as UserError).message).toContain('not found in workflow');
			expect((thrown as UserError).message).toContain('"Ghost"');
		});

		it('throws when an explicit pin name refers to a disabled root', () => {
			const nodes = [
				makeNode({ name: 'PgMem', type: '@n8n/n8n-nodes-langchain.memoryPostgresChat' }),
				makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent', disabled: true }),
			];
			const connections: IConnections = {
				PgMem: { ai_memory: [[{ node: 'Agent', type: 'ai_memory', index: 0 }]] },
			};
			let thrown: unknown;
			try {
				partitionAiRoots(makeWorkflow(nodes, connections), ['Agent']);
			} catch (e) {
				thrown = e;
			}
			expect(thrown).toBeInstanceOf(UserError);
			expect((thrown as UserError).message).toContain('disabled');
			expect((thrown as UserError).message).toContain('"Agent"');
		});

		it('throws when an explicit pin name refers to a non-AI-root node', () => {
			const nodes = [
				makeNode({ name: 'Set', type: 'n8n-nodes-base.set' }),
				makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
			];
			let thrown: unknown;
			try {
				partitionAiRoots(makeWorkflow(nodes), ['Set']);
			} catch (e) {
				thrown = e;
			}
			expect(thrown).toBeInstanceOf(UserError);
			expect((thrown as UserError).message).toContain('not AI root nodes');
			expect((thrown as UserError).message).toContain('"Set"');
		});
	});

	describe('default partition (no explicit pin)', () => {
		it('intercepts an Agent backed by a non-protocol-binary memory', () => {
			const workflow = agentWithMemory('@n8n/n8n-nodes-langchain.memoryBufferWindow');
			const result = partitionAiRoots(workflow);
			expect(result.unpinNodes).toEqual(['Agent']);
			expect(result.pinNodes).toEqual([]);
			expect(result.autoPinned).toEqual([]);
		});

		it('returns an empty partition when the workflow has no AI roots', () => {
			const nodes = [makeNode({ name: 'Set', type: 'n8n-nodes-base.set' })];
			const result = partitionAiRoots(makeWorkflow(nodes));
			expect(result.unpinNodes).toEqual([]);
			expect(result.pinNodes).toEqual([]);
			expect(result.autoPinned).toEqual([]);
		});

		it('ignores disabled sub-nodes when partitioning', () => {
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
			const result = partitionAiRoots(makeWorkflow(nodes, connections));
			expect(result.unpinNodes).toEqual(['Agent']);
			expect(result.autoPinned).toEqual([]);
		});
	});

	describe('explicit pin opt-out', () => {
		it('moves explicitly pinned roots to pinNodes', () => {
			const nodes = [
				makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
				makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
			];
			const connections: IConnections = {
				OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
			};
			const result = partitionAiRoots(makeWorkflow(nodes, connections), ['Agent']);
			expect(result.unpinNodes).toEqual([]);
			expect(result.pinNodes).toEqual(['Agent']);
			expect(result.autoPinned).toEqual([]);
		});
	});

	describe('auto-pin on incompatible sub-nodes', () => {
		it.each([
			['Postgres memory', '@n8n/n8n-nodes-langchain.memoryPostgresChat'],
			['Redis memory', '@n8n/n8n-nodes-langchain.memoryRedisChat'],
			['MongoDB memory', '@n8n/n8n-nodes-langchain.memoryMongoDbChat'],
		])('auto-pins an Agent backed by %s', (_label, memoryType) => {
			const workflow = agentWithMemory(memoryType);
			const result = partitionAiRoots(workflow);
			expect(result.unpinNodes).toEqual([]);
			expect(result.pinNodes).toEqual(['Agent']);
			expect(result.autoPinned).toContainEqual({
				root: 'Agent',
				subNode: 'Memory',
				subNodeType: memoryType,
				reason: 'protocol_binary',
			});
		});

		it.each([
			'@n8n/n8n-nodes-langchain.vectorStorePGVector',
			'@n8n/n8n-nodes-langchain.vectorStoreMongoDBAtlas',
			'@n8n/n8n-nodes-langchain.vectorStoreRedis',
			'@n8n/n8n-nodes-langchain.vectorStoreMilvus',
			'@n8n/n8n-nodes-langchain.chatHubVectorStorePGVector',
		])('auto-pins an Agent backed by protocol-binary vector store %s', (vectorStoreType) => {
			const nodes = [
				makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
				makeNode({ name: 'Store', type: vectorStoreType }),
				makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
			];
			const connections: IConnections = {
				OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
				Store: { ai_vectorStore: [[{ node: 'Agent', type: 'ai_vectorStore', index: 0 }]] },
			};
			const result = partitionAiRoots(makeWorkflow(nodes, connections));
			expect(result.pinNodes).toEqual(['Agent']);
			expect(result.autoPinned.some((e) => e.reason === 'protocol_binary')).toBe(true);
		});

		it('partitions independently across multiple roots — pin one, intercept the other', () => {
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
			const result = partitionAiRoots(makeWorkflow(nodes, connections));
			expect(result.unpinNodes).toEqual(['AgentB']);
			expect(result.pinNodes).toEqual(['AgentA']);
			expect(result.autoPinned.map((e) => e.root)).toEqual(['AgentA']);
		});
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

		it('intercepts an Agent backed by lmChatOpenAi (the only mapped vendor for M1)', () => {
			const result = partitionAiRoots(agentWithLlm('@n8n/n8n-nodes-langchain.lmChatOpenAi'));
			expect(result.unpinNodes).toEqual(['Agent']);
			expect(result.autoPinned).toEqual([]);
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
		])('auto-pins an Agent backed by unmapped vendor LLM %s', (llmType) => {
			const result = partitionAiRoots(agentWithLlm(llmType));
			expect(result.pinNodes).toEqual(['Agent']);
			expect(result.autoPinned[0]).toMatchObject({
				root: 'Agent',
				subNodeType: llmType,
				reason: 'unsupported_vendor_llm',
			});
		});

		it('ignores disabled vendor LLM sub-nodes when partitioning', () => {
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
			const result = partitionAiRoots(makeWorkflow(nodes, connections));
			expect(result.unpinNodes).toEqual(['Agent']);
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

			it.each([
				['no options', {}],
				['empty baseURL', { options: { baseURL: '' } }],
				['whitespace-only baseURL', { options: { baseURL: '   ' } }],
			])('intercepts lmChatOpenAi with %s', (_label, parameters) => {
				const result = partitionAiRoots(agentWithOpenAi(parameters));
				expect(result.unpinNodes).toEqual(['Agent']);
			});

			it('auto-pins lmChatOpenAi when options.baseURL would bypass the credential rewrite', () => {
				const workflow = agentWithOpenAi({
					options: { baseURL: 'https://my-proxy.example.com/v1' },
				});
				const result = partitionAiRoots(workflow);
				expect(result.pinNodes).toEqual(['Agent']);
				expect(result.autoPinned[0]).toMatchObject({
					root: 'Agent',
					subNode: 'OpenAI',
					reason: 'unsafe_baseurl_override',
				});
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
				const result = partitionAiRoots(makeWorkflow(nodes, connections));
				expect(result.unpinNodes).toEqual(['Agent']);
			});
		});

		describe('shared vendor LLM sub-node across multiple roots', () => {
			function workflowWithSharedSubNode(): IWorkflowBase {
				const nodes = [
					makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
					makeNode({ name: 'AgentA', type: '@n8n/n8n-nodes-langchain.agent' }),
					makeNode({ name: 'AgentB', type: '@n8n/n8n-nodes-langchain.agent' }),
				];
				const connections: IConnections = {
					OpenAI: {
						ai_languageModel: [
							[
								{ node: 'AgentA', type: 'ai_languageModel', index: 0 },
								{ node: 'AgentB', type: 'ai_languageModel', index: 0 },
							],
						],
					},
				};
				return makeWorkflow(nodes, connections);
			}

			it('auto-pins both roots when one OpenAI sub-node feeds both', () => {
				const result = partitionAiRoots(workflowWithSharedSubNode());
				expect(result.unpinNodes).toEqual([]);
				expect(result.pinNodes).toEqual(['AgentA', 'AgentB']);
				const reasons = result.autoPinned.map((e) => e.reason);
				expect(reasons).toContain('shared_vendor_llm_subnode');
			});

			it('intercepts the remaining root when the other one is explicitly pinned', () => {
				// AgentA is opted out → AgentB no longer shares the sub-node ambiguously.
				const result = partitionAiRoots(workflowWithSharedSubNode(), ['AgentA']);
				expect(result.unpinNodes).toEqual(['AgentB']);
				expect(result.pinNodes).toEqual(['AgentA']);
			});

			it('ignores a disabled shared sub-node when partitioning', () => {
				const nodes = [
					makeNode({
						name: 'OpenAI',
						type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
						disabled: true,
					}),
					makeNode({ name: 'AgentA', type: '@n8n/n8n-nodes-langchain.agent' }),
					makeNode({ name: 'AgentB', type: '@n8n/n8n-nodes-langchain.agent' }),
				];
				const connections: IConnections = {
					OpenAI: {
						ai_languageModel: [
							[
								{ node: 'AgentA', type: 'ai_languageModel', index: 0 },
								{ node: 'AgentB', type: 'ai_languageModel', index: 0 },
							],
						],
					},
				};
				const result = partitionAiRoots(makeWorkflow(nodes, connections));
				expect(result.unpinNodes.sort()).toEqual(['AgentA', 'AgentB']);
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

	it('also self-maps the root in subNodeToRoot so agent-context credential lookups resolve', () => {
		// LangChain's Agent invokes the LLM sub-node's `supplyData` with a
		// context whose `executeData.node` is the Agent itself (observed
		// empirically). The credential helper looks up `subNodeToRoot` by
		// that name — without the self-map, the lookup would miss and the
		// SDK would post to the wire server's loud-fail no-root route.
		const nodes = [
			makeNode({ name: 'OpenAI', type: '@n8n/n8n-nodes-langchain.lmChatOpenAi' }),
			makeNode({ name: 'Agent', type: '@n8n/n8n-nodes-langchain.agent' }),
		];
		const connections: IConnections = {
			OpenAI: { ai_languageModel: [[{ node: 'Agent', type: 'ai_languageModel', index: 0 }]] },
		};

		const routing = buildVendorLlmRouting(makeWorkflow(nodes, connections), ['Agent']);

		expect(routing.subNodeToRoot.get('Agent')).toBe('Agent');
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

		// `Agent` is also present in subNodeToRoot via the agent-context
		// self-map (see test above) — assert by lookup so the test isn't
		// sensitive to insertion order.
		expect(routing.subNodeToRoot.get('OpenAI')).toBe('Agent');
		expect(routing.subNodeToRoot.get('Agent')).toBe('Agent');
		expect(routing.subNodeToRoot.size).toBe(2);
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

	it('defensive: maps a shared sub-node to the first root (topology refused by guard upstream)', () => {
		// `assertUnpinCompatibility` refuses this topology before
		// `buildVendorLlmRouting` is reached. This test exercises the
		// defensive `!has(...)` check directly in case a caller ever bypasses
		// the guard — the routing must remain deterministic (first root wins,
		// no overwrite mid-build) so the wire server doesn't see a
		// half-mutated state.
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

		// First root in unpinNodes wins; second is dropped (defensive).
		expect(routing.subNodeToRoot.get('Shared OpenAI')).toBe('Agent A');
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

describe('detectBinaryDependencies', () => {
	it('returns undefined when no node consumes a binary attachment', () => {
		const nodes = [
			makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			makeNode({
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				parameters: { resource: 'message', operation: 'post', text: 'hello' },
			}),
		];
		expect(detectBinaryDependencies(makeWorkflow(nodes))).toBeUndefined();
	});

	it('detects $binary.<key> expressions in node parameters', () => {
		const nodes = [
			makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			makeNode({
				name: 'Send',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					url: 'https://example.com/upload',
					body: { value: '={{ $binary.attachment }}' },
				},
			}),
		];
		const result = detectBinaryDependencies(makeWorkflow(nodes));
		expect(result).toMatchObject({ propertyName: 'attachment' });
	});

	it('detects Extract from File as a binary consumer (allowlist fallback)', () => {
		const nodes = [
			makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			makeNode({
				name: 'Extract',
				type: 'n8n-nodes-base.extractFromFile',
				parameters: { operation: 'pdf' },
			}),
		];
		const result = detectBinaryDependencies(makeWorkflow(nodes));
		expect(result).toMatchObject({
			propertyName: 'data',
			contentType: 'application/pdf',
		});
	});

	it('does NOT mark Telegram as a binary consumer unless $binary is referenced (sendVoice only sometimes uses binary)', () => {
		const nodes = [
			makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			makeNode({
				name: 'Telegram',
				type: 'n8n-nodes-base.telegram',
				parameters: { resource: 'message', operation: 'sendVoice' },
			}),
		];
		expect(detectBinaryDependencies(makeWorkflow(nodes))).toBeUndefined();
	});

	it('picks up Telegram sendVoice when it references $binary.data and uses OGG default', () => {
		const nodes = [
			makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			makeNode({
				name: 'Telegram',
				type: 'n8n-nodes-base.telegram',
				parameters: {
					resource: 'message',
					operation: 'sendVoice',
					binaryPropertyName: '={{ $binary.data }}',
				},
			}),
		];
		const result = detectBinaryDependencies(makeWorkflow(nodes));
		expect(result?.propertyName).toBe('data');
		expect(result?.contentType).toBe('audio/ogg');
		expect(result?.filename).toBe('voice.ogg');
	});

	it('prefers $binary.<key> expressions over the allowlist when both are present', () => {
		const nodes = [
			makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			makeNode({
				name: 'Extract',
				type: 'n8n-nodes-base.extractFromFile',
				parameters: {
					operation: 'pdf',
					binaryPropertyName: '={{ $binary.uploadedFile }}',
				},
			}),
		];
		const result = detectBinaryDependencies(makeWorkflow(nodes));
		expect(result?.propertyName).toBe('uploadedFile');
		expect(result?.contentType).toBe('application/pdf');
	});

	it('detects nested inputDataFieldName on HTTP Request multipart formBinaryData', () => {
		const nodes = [
			makeNode({ name: 'Submission Form', type: 'n8n-nodes-base.formTrigger' }),
			makeNode({
				name: 'Upload Document',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {
					method: 'POST',
					url: 'https://api.example.com/v1/documents',
					sendBody: true,
					contentType: 'multipart-form-data',
					bodyParameters: {
						parameters: [
							{ parameterType: 'formBinaryData', name: 'file', inputDataFieldName: 'Document' },
							{ name: 'title', value: 'Uploaded from form' },
						],
					},
				},
			}),
		];
		const result = detectBinaryDependencies(makeWorkflow(nodes));
		expect(result?.propertyName).toBe('Document');
	});

	it('detects literal binaryPropertyName parameters on upload nodes (Slack files.upload)', () => {
		const nodes = [
			makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			makeNode({
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				parameters: {
					resource: 'file',
					operation: 'upload',
					binaryPropertyName: 'image',
					channels: ['#general'],
				},
			}),
		];
		const result = detectBinaryDependencies(makeWorkflow(nodes));
		expect(result?.propertyName).toBe('image');
	});

	it('detects literal binaryPropertyName on S3 PutObject with default key name', () => {
		const nodes = [
			makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			makeNode({
				name: 'S3',
				type: 'n8n-nodes-base.awsS3',
				parameters: {
					resource: 'file',
					operation: 'upload',
					binaryPropertyName: 'data',
				},
			}),
		];
		const result = detectBinaryDependencies(makeWorkflow(nodes));
		expect(result?.propertyName).toBe('data');
	});

	it('extracts the literal from a quoted-string expression on binaryPropertyName', () => {
		const nodes = [
			makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			makeNode({
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				parameters: {
					resource: 'file',
					operation: 'upload',
					binaryPropertyName: '={{ "image" }}',
				},
			}),
		];
		expect(detectBinaryDependencies(makeWorkflow(nodes))?.propertyName).toBe('image');
	});

	it('falls back to `data` when binaryPropertyName is a dynamic expression', () => {
		const nodes = [
			makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			makeNode({
				name: 'Slack',
				type: 'n8n-nodes-base.slack',
				parameters: {
					resource: 'file',
					operation: 'upload',
					binaryPropertyName: '={{ $json.binaryKey }}',
				},
			}),
		];
		expect(detectBinaryDependencies(makeWorkflow(nodes))?.propertyName).toBe('data');
	});

	it('ignores disabled nodes', () => {
		const nodes = [
			makeNode({ name: 'Webhook', type: 'n8n-nodes-base.webhook' }),
			makeNode({
				name: 'Extract',
				type: 'n8n-nodes-base.extractFromFile',
				disabled: true,
				parameters: { operation: 'pdf' },
			}),
		];
		expect(detectBinaryDependencies(makeWorkflow(nodes))).toBeUndefined();
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
		const generate = vi.fn();
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
		vi.clearAllMocks();
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
