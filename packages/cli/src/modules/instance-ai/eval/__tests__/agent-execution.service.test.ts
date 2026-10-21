import {
	AgentEvent,
	type Agent as RuntimeAgent,
	type AgentEventHandler,
	type GenerateResult,
} from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { ExecutionsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { EvalLlmMockHandler } from 'n8n-core';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { AgentEvaluationService } from '@/modules/agents/evaluation/agent-evaluation.service';
import type {
	AgentEvaluationPreparation,
	AgentEvaluationRunSource,
} from '@/modules/agents/evaluation/agent-evaluation.contracts';

import { EvalAgentExecutionService, mcpUrlsMatch } from '../agent-execution.service';
import { generateAgentScenarioSeed } from '../agent-scenario-seed';
import { createMcpMockFetch } from '../mcp-mock-fetch';
import { createLlmMockHandler } from '../mock-handler';
import { createWebSearchMock } from '../web-search-mock';

vi.mock('@/modules/agents/evaluation/agent-evaluation.service', () => ({
	AgentEvaluationService: class AgentEvaluationService {},
}));
vi.mock('@/utils/ai-proxy-fetch', () => ({ createAiProxyFetch: vi.fn(() => vi.fn()) }));
vi.mock('../agent-scenario-seed', () => ({ generateAgentScenarioSeed: vi.fn() }));
vi.mock('../mcp-mock-fetch', () => ({ createMcpMockFetch: vi.fn(() => vi.fn()) }));
vi.mock('../mock-handler', () => ({ createLlmMockHandler: vi.fn() }));
vi.mock('../web-search-mock', () => ({ createWebSearchMock: vi.fn(() => vi.fn()) }));

const logger = mock<Logger>();
const agentEvaluation = mock<AgentEvaluationService>();
const user = mock<User>({ id: 'user/123:raw' });

const buildRuntime = vi.fn();

const baseConfig: AgentJsonConfig = {
	name: 'Support agent',
	model: 'openai/gpt-5',
	credential: 'cred-1',
	instructions: 'Help with support tickets.',
	tools: [
		{
			type: 'node',
			name: 'Slack Tool',
			node: { nodeType: 'n8n-nodes-base.slackTool', nodeTypeVersion: 1, nodeParameters: {} },
		},
	],
} as unknown as AgentJsonConfig;

function setConfig(config: AgentJsonConfig) {
	const preparation: AgentEvaluationPreparation = {
		config,
		tools: [{ name: 'Slack_Tool', kind: 'node', nodeType: 'n8n-nodes-base.slackTool' }],
		skippedFeatures: [],
		buildRuntime,
	};
	agentEvaluation.prepare.mockResolvedValue({ preparation });
}

const seed = {
	openingMessage: 'Hi, I need help with order #123',
	globalContext: 'Customer jane@example.com',
	toolHints: { Slack_Tool: 'Posting succeeds' },
	warnings: [],
};

const makeGenerateResult = (overrides: Partial<GenerateResult> = {}): GenerateResult =>
	({
		runId: 'run-1',
		messages: [
			{ role: 'user', content: [{ type: 'text', text: seed.openingMessage }] },
			{ role: 'assistant', content: [{ type: 'text', text: 'All sorted!' }] },
		],
		toolCalls: [{ tool: 'Slack_Tool', input: { text: 'hi' }, output: { ok: true } }],
		usage: { promptTokens: 100, completionTokens: 40, totalTokens: 140 },
		model: 'openai/gpt-5',
		finishReason: 'stop',
		getState: vi.fn(),
		...overrides,
	}) as unknown as GenerateResult;

function buildService(
	overrides: {
		queueMode?: boolean;
		agentsActive?: boolean;
		mcpRegistryActive?: boolean;
	} = {},
) {
	const executionsConfig = mock<ExecutionsConfig>();
	Object.defineProperty(executionsConfig, 'mode', {
		get: () => (overrides.queueMode ? 'queue' : 'regular'),
	});
	const moduleRegistry = mock<ModuleRegistry>();
	moduleRegistry.isActive.mockImplementation((moduleName) => {
		if (moduleName === 'agents') return overrides.agentsActive ?? true;
		if (moduleName === 'mcp-registry') return overrides.mcpRegistryActive ?? true;
		return true;
	});
	return new EvalAgentExecutionService(
		logger,
		executionsConfig,
		moduleRegistry,
		mock<OutboundHttp>(),
	);
}

describe('EvalAgentExecutionService.executeWithLlmMock', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(AgentEvaluationService, agentEvaluation);

		vi.mocked(generateAgentScenarioSeed).mockResolvedValue(seed);
		vi.mocked(createLlmMockHandler).mockReturnValue(
			vi.fn().mockResolvedValue({ body: { ok: true }, statusCode: 200, headers: {} }),
		);
		setConfig({ ...baseConfig });
	});

	afterEach(() => {
		Container.reset();
	});

	const request = { projectId: 'proj-1' };

	it('prepares every batch case from the captured run source', async () => {
		const source = mock<AgentEvaluationRunSource>();
		buildRuntime.mockResolvedValue({
			generate: vi.fn().mockResolvedValue(makeGenerateResult()),
			close: vi.fn(),
		});
		await buildService().executeWithLlmMock('agent-1', user, request, 'Case', { source });
		expect(agentEvaluation.prepare).toHaveBeenCalledWith(user, 'proj-1', 'agent-1', source);
	});

	it.each([false, true])(
		'keeps runtime IDs for repeated calls at completion (identical: %s)',
		async (identical) => {
			const handlers = new Map<AgentEvent, AgentEventHandler>();
			const first = { tool: 'Slack_Tool', input: { text: 'first' }, output: { sent: 'first' } };
			const second = identical
				? { ...first }
				: { ...first, input: { text: 'second' }, output: { sent: 'second' } };
			const skipped = { ...first, output: 'Skipped', canceled: true };
			buildRuntime.mockResolvedValue({
				on: (event: AgentEvent, handler: AgentEventHandler) => handlers.set(event, handler),
				close: vi.fn(),
				generate: vi.fn(async () => {
					for (const [toolCallId, entry] of [
						['first', first],
						['second', second],
					] as const) {
						handlers.get(AgentEvent.ToolExecutionStart)?.({
							type: AgentEvent.ToolExecutionStart,
							toolCallId,
							toolName: entry.tool,
							args: entry.input,
						});
					}
					// Completion order can differ from the original tool-call order.
					for (const [toolCallId, entry] of [
						['second', second],
						['first', first],
					] as const) {
						handlers.get(AgentEvent.ToolExecutionEnd)?.({
							type: AgentEvent.ToolExecutionEnd,
							toolCallId,
							toolName: entry.tool,
							result: entry.output,
							isError: false,
						});
					}
					return makeGenerateResult({ toolCalls: [first, second, skipped] });
				}),
			});
			const result = await buildService().executeWithLlmMock(
				'agent-1',
				user,
				request,
				'Send twice',
				{ onProgress: vi.fn() },
			);
			expect(result.toolCalls).toEqual([
				expect.objectContaining({ ...first, toolCallId: 'first', status: 'completed' }),
				expect.objectContaining({ ...second, toolCallId: 'second', status: 'completed' }),
				expect.objectContaining({ tool: 'Slack_Tool', output: 'Skipped', error: 'canceled' }),
			]);
		},
	);

	it('records search progress only for the matching active call and ignores late endings', async () => {
		const handlers = new Map<AgentEvent, AgentEventHandler>();
		const onProgress = vi.fn().mockResolvedValue(undefined);
		const search = { query: 'shipping' };
		const searchResult = { query: 'shipping', results: [] };
		buildRuntime.mockResolvedValue({
			on: (event: AgentEvent, handler: AgentEventHandler) => handlers.set(event, handler),
			close: vi.fn(),
			generate: vi.fn(async () => {
				for (const toolName of ['Slack_Tool', 'web_search']) {
					handlers.get(AgentEvent.ToolExecutionStart)?.({
						type: AgentEvent.ToolExecutionStart,
						toolName,
						toolCallId: toolName,
						args: search,
					});
				}
				const { onSearch } = vi.mocked(createWebSearchMock).mock.calls[0][0];
				onSearch(search, searchResult);
				handlers.get(AgentEvent.ToolExecutionEnd)?.({
					type: AgentEvent.ToolExecutionEnd,
					toolName: 'web_search',
					toolCallId: 'web_search',
					result: searchResult,
					isError: false,
				});
				// A delegated search has no active parent call to update.
				onSearch({ query: 'returns' }, { query: 'returns', results: [] });
				// A runtime can report completion without a prior start event.
				handlers.get(AgentEvent.ToolExecutionEnd)?.({
					type: AgentEvent.ToolExecutionEnd,
					toolName: 'lookup',
					toolCallId: 'orphan',
					result: 'found',
					isError: false,
				});
				return makeGenerateResult({
					toolCalls: [{ tool: 'lookup', input: {}, output: 'found' }],
				});
			}),
		});
		const result = await buildService().executeWithLlmMock('agent-1', user, request, 'Search', {
			onProgress,
		});
		expect(onProgress.mock.calls[2][0]).toEqual([
			expect.objectContaining({ tool: 'Slack_Tool', mocked: false, interceptedRequests: [] }),
			expect.objectContaining({
				tool: 'web_search',
				status: 'running',
				mocked: true,
				interceptedRequests: [expect.objectContaining({ requestBody: search })],
			}),
		]);
		expect(onProgress).toHaveBeenCalledTimes(6);
		expect(
			result.toolCalls.find((call) => call.tool === 'web_search')?.interceptedRequests,
		).toHaveLength(2);
		expect(result.toolCalls.find((call) => call.toolCallId === 'orphan')).toMatchObject({
			kind: 'other',
			output: 'found',
		});
		handlers.get(AgentEvent.ToolExecutionEnd)?.({
			type: AgentEvent.ToolExecutionEnd,
			toolName: 'lookup',
			toolCallId: 'late',
			result: 'ignored',
			isError: false,
		});
		await Promise.resolve();
		expect(onProgress).toHaveBeenCalledTimes(6);
	});

	it('classifies delegated MCP records from their intercepted request metadata', async () => {
		buildRuntime.mockResolvedValue({
			close: vi.fn(),
			generate: vi.fn(async () => {
				vi.mocked(createMcpMockFetch).mock.calls[0][0].onToolCall({
					serverName: 'child',
					toolName: 'lookup',
					args: {},
					result: { text: 'found', isError: false },
				});
				const instrumentation = buildRuntime.mock.calls[0][0] as {
					onMcpToolCallSettled: (event: {
						serverName: string;
						toolName: string;
						success: boolean;
					}) => void;
				};
				instrumentation.onMcpToolCallSettled({
					serverName: 'child',
					toolName: 'lookup',
					success: true,
				});
				return makeGenerateResult({ toolCalls: [] });
			}),
		});
		const result = await buildService().executeWithLlmMock('agent-1', user, request);
		expect(result.toolCalls).toEqual([
			expect.objectContaining({ tool: 'child_lookup', kind: 'mcp', mocked: true }),
		]);
	});

	it('reports tool progress before generation finishes and flushes writes before returning', async () => {
		const handlers = new Map<AgentEvent, AgentEventHandler>();
		const onProgress = vi.fn().mockResolvedValue(undefined);
		let finish: (value: GenerateResult) => void = () => {};
		const generate = vi.fn(async () => {
			handlers.get(AgentEvent.ToolExecutionStart)?.({
				type: AgentEvent.ToolExecutionStart,
				toolCallId: 'send-1',
				toolName: 'Slack_Tool',
				args: { text: 'hello' },
			});
			handlers.get(AgentEvent.ToolExecutionEnd)?.({
				type: AgentEvent.ToolExecutionEnd,
				toolCallId: 'send-1',
				toolName: 'Slack_Tool',
				result: { sent: true },
				isError: false,
			});
			handlers.get(AgentEvent.ToolExecutionStart)?.({
				type: AgentEvent.ToolExecutionStart,
				toolCallId: 'wait-1',
				toolName: 'wait_for_reply',
				args: {},
			});
			return await new Promise<GenerateResult>((resolve) => {
				finish = resolve;
			});
		});
		buildRuntime.mockResolvedValue({
			generate,
			close: vi.fn(),
			on: (event: AgentEvent, handler: AgentEventHandler) => handlers.set(event, handler),
		});
		let settled = false;
		const running = buildService()
			.executeWithLlmMock('agent-1', user, request, 'Send a message', { onProgress })
			.then((value) => {
				settled = true;
				return value;
			});
		await vi.waitFor(() => expect(onProgress).toHaveBeenCalledTimes(3));
		expect(settled).toBe(false);
		expect(onProgress.mock.calls[2][0]).toEqual([
			expect.objectContaining({
				toolCallId: 'send-1',
				status: 'completed',
				output: { sent: true },
			}),
			expect.objectContaining({ toolCallId: 'wait-1', status: 'running' }),
		]);
		finish(makeGenerateResult());
		await running;
	});

	it('publishes a mocked send while the tool waits for a reply', async () => {
		const handlers = new Map<AgentEvent, AgentEventHandler>();
		const onProgress = vi.fn().mockResolvedValue(undefined);
		let finish!: (value: GenerateResult) => void;
		let mockRequest!: EvalLlmMockHandler;
		const send = async () =>
			await mockRequest(
				{ url: 'https://slack.com/api/chat.postMessage', method: 'POST', body: { text: 'Hello' } },
				{ name: 'Slack_Tool', type: 'n8n-nodes-base.slackTool' } as INode,
			);
		const generate = vi.fn(async () => {
			handlers.get(AgentEvent.ToolExecutionStart)?.({
				type: AgentEvent.ToolExecutionStart,
				toolCallId: 'send-1',
				toolName: 'Slack_Tool',
				args: { text: 'Hello' },
			});
			const instrumentation = buildRuntime.mock.calls[0][0] as {
				configureToolAdditionalData: (
					data: Record<string, unknown>,
					context: { toolName: string; toolKind: string },
				) => void;
			};
			const data: Record<string, unknown> = { credentialsHelper: { getDecrypted: vi.fn() } };
			instrumentation.configureToolAdditionalData(data, {
				toolName: 'Slack_Tool',
				toolKind: 'node',
			});
			mockRequest = data.evalLlmMockHandler as EvalLlmMockHandler;
			await send();
			return await new Promise<GenerateResult>((resolve) => {
				finish = resolve;
			});
		});
		buildRuntime.mockResolvedValue({
			generate,
			close: vi.fn(),
			on: (event: AgentEvent, handler: AgentEventHandler) => handlers.set(event, handler),
		});
		let settled = false;
		const running = buildService()
			.executeWithLlmMock('agent-1', user, request, 'Send then wait', { onProgress })
			.then((result) => {
				settled = true;
				return result;
			});
		try {
			await vi.waitFor(() => expect(onProgress).toHaveBeenCalledTimes(2));
			expect(settled).toBe(false);
			expect(onProgress).toHaveBeenLastCalledWith([
				expect.objectContaining({
					toolCallId: 'send-1',
					status: 'running',
					mocked: true,
					interceptedRequests: [
						expect.objectContaining({ requestBody: { text: 'Hello' }, mockResponse: { ok: true } }),
					],
				}),
			]);
		} finally {
			finish(makeGenerateResult());
			await running;
		}
		const writes = onProgress.mock.calls.length;
		await send();
		await Promise.resolve();
		expect(onProgress).toHaveBeenCalledTimes(writes);
	});

	it('serializes progress writes and waits for the last write without failing the run', async () => {
		const handlers = new Map<AgentEvent, AgentEventHandler>();
		let releaseWrite: () => void = () => {};
		const onProgress = vi
			.fn()
			.mockImplementationOnce(
				async () =>
					await new Promise<void>((resolve) => {
						releaseWrite = resolve;
					}),
			)
			.mockRejectedValueOnce(new Error('progress unavailable'))
			.mockResolvedValue(undefined);
		const generate = vi.fn(async () => {
			handlers.get(AgentEvent.ToolExecutionStart)?.({
				type: AgentEvent.ToolExecutionStart,
				toolCallId: 'call-1',
				toolName: 'Slack_Tool',
				args: {},
			});
			handlers.get(AgentEvent.ToolExecutionEnd)?.({
				type: AgentEvent.ToolExecutionEnd,
				toolCallId: 'call-1',
				toolName: 'Slack_Tool',
				result: { sent: true },
				isError: false,
			});
			return makeGenerateResult();
		});
		buildRuntime.mockResolvedValue({
			generate,
			close: vi.fn(),
			on: (event: AgentEvent, handler: AgentEventHandler) => handlers.set(event, handler),
		});
		let settled = false;
		const running = buildService()
			.executeWithLlmMock('agent-1', user, request, 'Send a message', { onProgress })
			.then((value) => {
				settled = true;
				return value;
			});
		await vi.waitFor(() => expect(onProgress).toHaveBeenCalledOnce());
		expect(settled).toBe(false);
		releaseWrite();
		expect((await running).success).toBe(true);
		expect(onProgress).toHaveBeenCalledTimes(3);
		handlers.get(AgentEvent.ToolExecutionStart)?.({
			type: AgentEvent.ToolExecutionStart,
			toolCallId: 'late',
			toolName: 'Slack_Tool',
			args: {},
		});
		await Promise.resolve();
		expect(onProgress).toHaveBeenCalledTimes(3);
	});

	it('flushes failed and interrupted tool progress before returning a generation error', async () => {
		const handlers = new Map<AgentEvent, AgentEventHandler>();
		const onProgress = vi.fn().mockResolvedValue(undefined);
		const close = vi.fn();
		buildRuntime.mockResolvedValue({
			generate: vi.fn(async () => {
				for (const toolCallId of ['failed', 'interrupted']) {
					handlers.get(AgentEvent.ToolExecutionStart)?.({
						type: AgentEvent.ToolExecutionStart,
						toolCallId,
						toolName: 'Slack_Tool',
						args: {},
					});
				}
				handlers.get(AgentEvent.ToolExecutionEnd)?.({
					type: AgentEvent.ToolExecutionEnd,
					toolCallId: 'failed',
					toolName: 'Slack_Tool',
					result: 'Tool failed',
					isError: true,
				});
				throw new Error('Generation stopped');
			}),
			close,
			on: (event: AgentEvent, handler: AgentEventHandler) => handlers.set(event, handler),
		});
		const result = await buildService().executeWithLlmMock(
			'agent-1',
			user,
			request,
			'Send a message',
			{ onProgress },
		);
		expect(result.success).toBe(false);
		expect(result.errors).toContain('Agent run failed: Generation stopped');
		expect(result.toolCalls).toEqual([
			expect.objectContaining({
				toolCallId: 'failed',
				status: 'error',
				error: 'tool_execution_failed',
				output: 'Tool failed',
			}),
			expect.objectContaining({
				toolCallId: 'interrupted',
				status: 'error',
				error: 'execution_stopped',
			}),
		]);
		expect(onProgress).toHaveBeenLastCalledWith([
			expect.objectContaining({
				toolCallId: 'failed',
				status: 'error',
				error: 'tool_execution_failed',
				output: 'Tool failed',
			}),
			expect.objectContaining({
				toolCallId: 'interrupted',
				status: 'error',
				error: 'execution_stopped',
			}),
		]);
		expect(close).toHaveBeenCalledOnce();
		expect(onProgress.mock.invocationCallOrder.at(-1)).toBeLessThan(
			close.mock.invocationCallOrder[0],
		);
	});

	it('refuses queue mode upfront', async () => {
		const result = await buildService({ queueMode: true }).executeWithLlmMock(
			'agent-1',
			user,
			request,
		);
		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/queue mode is not supported/);
		expect(agentEvaluation.prepare).not.toHaveBeenCalled();
	});

	it('refuses when the agents module is inactive', async () => {
		const result = await buildService({ agentsActive: false }).executeWithLlmMock(
			'agent-1',
			user,
			request,
		);
		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/agents module/);
	});

	it('reports not-accessible when the user lacks agent:execute', async () => {
		agentEvaluation.prepare.mockResolvedValue({
			error: 'Agent agent-1 not found or not accessible',
		});
		const result = await buildService().executeWithLlmMock('agent-1', user, request);
		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/not found or not accessible/);
	});

	it('refuses when Agents is disabled before making model calls', async () => {
		agentEvaluation.prepare.mockResolvedValue({
			error: 'Agents are disabled. Ask an instance admin to enable them in Settings > Agents.',
		});
		const generate = vi.fn().mockResolvedValue(makeGenerateResult());
		buildRuntime.mockResolvedValue({ generate, close: vi.fn() });

		const result = await buildService().executeWithLlmMock('agent-1', user, request);

		expect(result.success).toBe(false);
		expect(result.errors[0]).toContain('Agents are disabled');
		expect(generateAgentScenarioSeed).not.toHaveBeenCalled();
		expect(buildRuntime).not.toHaveBeenCalled();
		expect(generate).not.toHaveBeenCalled();
	});

	it('reports not-found when the agent does not exist in the project', async () => {
		agentEvaluation.prepare.mockResolvedValue({
			error: 'Agent agent-1 not found or not accessible',
		});
		const result = await buildService().executeWithLlmMock('agent-1', user, request);
		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/not found or not accessible/);
	});

	it('reports a config-less agent', async () => {
		agentEvaluation.prepare.mockResolvedValue({
			error: 'Agent agent-1 has no JSON config to run.',
		});
		const result = await buildService().executeWithLlmMock('agent-1', user, request);
		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/no JSON config/);
	});

	it('surfaces seed-generation failure as a FRAMEWORK ISSUE', async () => {
		vi.mocked(generateAgentScenarioSeed).mockRejectedValue(
			new Error('FRAMEWORK ISSUE: agent scenario seed generation failed — no message'),
		);
		const result = await buildService().executeWithLlmMock('agent-1', user, request);
		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/^FRAMEWORK ISSUE:/);
		expect(buildRuntime).not.toHaveBeenCalled();
	});

	it('scrubs secret values from the case scenario signal but runs the case input verbatim', async () => {
		const generate = vi.fn().mockResolvedValue(makeGenerateResult());
		const close = vi.fn().mockResolvedValue(undefined);
		buildRuntime.mockResolvedValue({ generate, close });

		const secret = 'sk-ABCDEF1234567890ABCDEF1234567890';
		const caseInput = `Refund order #123 with key ${secret}`;
		await buildService().executeWithLlmMock('agent-1', user, request, caseInput);

		// The signal fed to the seed/mock LLM calls has the secret scrubbed...
		const seedArgs = vi.mocked(generateAgentScenarioSeed).mock.calls[0]?.[0];
		expect(seedArgs?.scenarioHints).not.toContain(secret);
		expect(seedArgs?.scenarioHints).toContain('Refund order #123');
		// ...but the agent still receives the verbatim case input.
		expect(generate).toHaveBeenCalledWith(caseInput, expect.anything());
	});

	it('runs the happy path: real-model turn, mocked tool HTTP, mapped result', async () => {
		const innerCredentialsHelper = { getDecrypted: vi.fn() };
		const close = vi.fn().mockResolvedValue(undefined);
		const generate = vi.fn().mockImplementation(async () => {
			// Simulate a node-tool invocation mid-run: the instrumentation must
			// swap the credentials helper and serve HTTP through the mock.
			const instrumentation = buildRuntime.mock.calls[0][0] as {
				modelFetch?: unknown;
				configureToolAdditionalData: (
					additionalData: Record<string, unknown>,
					ctx: { toolName: string; toolKind: string },
				) => void;
			};
			const additionalData: Record<string, unknown> = {
				credentialsHelper: innerCredentialsHelper,
			};
			instrumentation.configureToolAdditionalData(additionalData, {
				toolName: 'Slack_Tool',
				toolKind: 'node',
			});
			expect(additionalData.credentialsHelper).not.toBe(innerCredentialsHelper);
			const handler = additionalData.evalLlmMockHandler as EvalLlmMockHandler;
			await handler(
				{ url: 'https://slack.com/api/chat.postMessage', method: 'POST', body: { text: 'hi' } },
				{ name: 'Slack_Tool', type: 'n8n-nodes-base.slackTool' } as INode,
			);
			return makeGenerateResult();
		});
		buildRuntime.mockResolvedValue({ generate, close });

		const result = await buildService().executeWithLlmMock('agent-1', user, {
			...request,
			scenarioHints: 'Customer asks about order #123',
		});

		expect(result.success).toBe(true);
		expect(result.runId).toBe('run-1');
		expect(result.finalText).toBe('All sorted!');
		expect(result.model).toBe('openai/gpt-5');
		expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 40 });
		expect(result.seed).toEqual(seed);
		expect(result.toolCalls).toHaveLength(1);
		expect(result.toolCalls[0]).toMatchObject({
			tool: 'Slack_Tool',
			kind: 'node',
			mocked: true,
		});
		expect(result.toolCalls[0].interceptedRequests[0]).toMatchObject({
			url: 'https://slack.com/api/chat.postMessage',
			method: 'POST',
			nodeType: 'n8n-nodes-base.slackTool',
			mockResponse: { ok: true },
		});
		expect(close).toHaveBeenCalledTimes(1);

		expect(buildRuntime.mock.calls[0][0].modelFetch).toBeDefined();
	});

	it('attributes MCP calls when the server name requires normalization', async () => {
		const config = {
			...baseConfig,
			mcpServers: [
				{
					name: 'Linear Prod',
					url: 'https://linear.example.com/mcp',
					transport: 'streamableHttp',
					authentication: 'none',
				},
			],
		} as unknown as AgentJsonConfig;
		setConfig(config);
		const generate = vi.fn().mockImplementation(async () => {
			const mcpMockOptions = vi.mocked(createMcpMockFetch).mock.calls[0][0];
			const call = {
				serverName: 'Linear Prod',
				toolName: 'list_issues',
				args: { query: 'bugs' },
				result: { text: 'Issue list', isError: false },
			};
			mcpMockOptions.onToolCall(call);
			const instrumentation = buildRuntime.mock.calls[0][0] as {
				onMcpToolCallSettled?: (event: {
					serverName: string;
					toolName: string;
					modelToolName?: string;
					success: boolean;
				}) => Promise<void> | void;
			};
			await instrumentation.onMcpToolCallSettled?.({
				serverName: call.serverName,
				toolName: call.toolName,
				modelToolName: 'Linear_Prod_list_issues',
				success: true,
			});
			return makeGenerateResult({
				toolCalls: [
					{
						tool: 'Linear_Prod_list_issues',
						input: { query: 'bugs' },
						output: { text: 'Issue list' },
					},
				],
			});
		});
		buildRuntime.mockResolvedValue({ generate, close: vi.fn() });

		const result = await buildService().executeWithLlmMock('agent-1', user, request);

		expect(result.toolCalls).toHaveLength(1);
		expect(result.toolCalls[0]).toMatchObject({
			tool: 'Linear_Prod_list_issues',
			kind: 'mcp',
			mocked: true,
		});
		expect(result.toolCalls[0].interceptedRequests).toHaveLength(1);
	});

	it('attributes colliding MCP tools by their exact model-facing names', async () => {
		const config = {
			...baseConfig,
			mcpServers: [
				{
					name: 'Linear Prod',
					url: 'https://linear.example.com/mcp',
					transport: 'streamableHttp',
					authentication: 'none',
				},
			],
		} as unknown as AgentJsonConfig;
		setConfig(config);
		const firstModelName = 'Linear_Prod_read_file_12345678';
		const secondModelName = 'Linear_Prod_read_file_87654321';
		const firstArgs = { path: 'first.txt' };
		const secondArgs = { path: 'second.txt' };
		const generate = vi.fn().mockImplementation(async () => {
			const mcpMockOptions = vi.mocked(createMcpMockFetch).mock.calls[0][0];
			const instrumentation = buildRuntime.mock.calls[0][0] as {
				onMcpToolCallSettled?: (event: {
					serverName: string;
					toolName: string;
					modelToolName?: string;
					success: boolean;
				}) => Promise<void> | void;
			};
			const calls = [
				{
					serverName: 'Linear Prod',
					toolName: 'read file',
					args: firstArgs,
					result: { text: 'first', isError: false },
					modelToolName: firstModelName,
				},
				{
					serverName: 'Linear Prod',
					toolName: 'read_file',
					args: secondArgs,
					result: { text: 'second', isError: false },
					modelToolName: secondModelName,
				},
			];
			for (const call of calls) {
				mcpMockOptions.onToolCall(call);
				await instrumentation.onMcpToolCallSettled?.({
					serverName: call.serverName,
					toolName: call.toolName,
					modelToolName: call.modelToolName,
					success: true,
				});
			}
			return makeGenerateResult({
				toolCalls: [
					{ tool: firstModelName, input: calls[0].args, output: { text: 'first' } },
					{ tool: secondModelName, input: calls[1].args, output: { text: 'second' } },
				],
			});
		});
		buildRuntime.mockResolvedValue({ generate, close: vi.fn() });

		const result = await buildService().executeWithLlmMock('agent-1', user, request);

		expect(result.toolCalls).toHaveLength(2);
		expect(result.toolCalls).toEqual([
			expect.objectContaining({
				tool: firstModelName,
				kind: 'mcp',
				mocked: true,
				interceptedRequests: [expect.objectContaining({ requestBody: firstArgs })],
			}),
			expect.objectContaining({
				tool: secondModelName,
				kind: 'mcp',
				mocked: true,
				interceptedRequests: [expect.objectContaining({ requestBody: secondArgs })],
			}),
		]);
	});

	it('uses explicit non-blocked tools as the canonical catalog when both categories are blocked', async () => {
		const config = {
			...baseConfig,
			mcpServers: [
				{
					name: 'Restricted MCP',
					url: 'https://custom.example.com/mcp',
					transport: 'streamableHttp',
					authentication: 'none',
					toolPermissions: {
						categories: { read: 'blocked', write: 'blocked' },
						tools: {
							search: 'always_allow',
							update: 'require_approval',
							delete: 'blocked',
						},
					},
				},
			],
		} as unknown as AgentJsonConfig;
		setConfig(config);
		buildRuntime.mockResolvedValue({
			generate: vi.fn().mockResolvedValue(makeGenerateResult()),
			close: vi.fn(),
		});

		await buildService({ mcpRegistryActive: false }).executeWithLlmMock('agent-1', user, request);

		expect(createMcpMockFetch).toHaveBeenCalledWith(
			expect.objectContaining({
				knownToolsByServer: {
					'Restricted MCP': [
						{ name: 'search', description: 'search' },
						{ name: 'update', description: 'update' },
					],
				},
			}),
		);
	});

	it('serves fallback web search through the instrumentation', async () => {
		const fullConfig = {
			...baseConfig,
			model: 'mistral/mistral-large',
			config: { webSearch: { enabled: true, provider: 'brave', credential: 'cred-2' } },
			subAgents: { agents: [{ agentId: 'child-1' }] },
		} as unknown as AgentJsonConfig;
		setConfig(fullConfig);
		buildRuntime.mockResolvedValue({
			generate: vi.fn().mockResolvedValue(makeGenerateResult()),
			close: vi.fn(),
		});

		const result = await buildService().executeWithLlmMock('agent-1', user, request);

		const instrumentation = buildRuntime.mock.calls[0][0] as {
			webSearch?: unknown;
			transformDelegatedAgentConfig?: (
				config: AgentJsonConfig,
				context: { subAgentId: string },
			) => AgentJsonConfig;
		};
		expect(instrumentation.webSearch).toBeDefined();
		expect(result.skippedFeatures).toEqual([]);
	});

	it('surfaces errored tool calls omitted from the run result via the intercepted ledger', async () => {
		// Node tools throw on failure and the SDK drops them from
		// GenerateResult.toolCalls — the intercepted request (e.g. an injected
		// channel_not_found) must still reach the judge.
		const generate = vi.fn().mockImplementation(async () => {
			const instrumentation = buildRuntime.mock.calls[0][0] as {
				configureToolAdditionalData: (
					additionalData: Record<string, unknown>,
					ctx: { toolName: string; toolKind: string },
				) => void;
			};
			const additionalData: Record<string, unknown> = { credentialsHelper: {} };
			instrumentation.configureToolAdditionalData(additionalData, {
				toolName: 'Slack_Tool',
				toolKind: 'node',
			});
			const handler = additionalData.evalLlmMockHandler as EvalLlmMockHandler;
			await handler({ url: 'https://slack.com/api/chat.postMessage', method: 'POST' }, {
				name: 'Slack_Tool',
				type: 'n8n-nodes-base.slackTool',
			} as INode);
			return makeGenerateResult({ toolCalls: [] });
		});
		buildRuntime.mockResolvedValue({ generate, close: vi.fn() });

		const result = await buildService().executeWithLlmMock('agent-1', user, request);

		expect(result.toolCalls).toHaveLength(1);
		expect(result.toolCalls[0]).toMatchObject({
			tool: 'Slack_Tool',
			kind: 'node',
			mocked: true,
			error: expect.stringContaining('interceptedRequests'),
		});
		expect(result.toolCalls[0].interceptedRequests).toHaveLength(1);
	});

	it('snapshots the tool ledger body so node-side mutation cannot rewrite the evidence', async () => {
		// Same aliasing hazard as the workflow ledger: `callEvalMockHandler` returns
		// this body to the node tool, and nodes like OpenAI's json_schema mode parse
		// fields in place — the judge must still see what was actually served.
		const served = { output: [{ content: [{ type: 'output_text', text: '{"a":1}' }] }] };
		vi.mocked(createLlmMockHandler).mockReturnValue(
			vi.fn().mockResolvedValue({ body: served, statusCode: 200, headers: {} }),
		);
		const generate = vi.fn().mockImplementation(async () => {
			const instrumentation = buildRuntime.mock.calls[0][0] as {
				configureToolAdditionalData: (
					additionalData: Record<string, unknown>,
					ctx: { toolName: string; toolKind: string },
				) => void;
			};
			const additionalData: Record<string, unknown> = { credentialsHelper: {} };
			instrumentation.configureToolAdditionalData(additionalData, {
				toolName: 'Slack_Tool',
				toolKind: 'node',
			});
			const handler = additionalData.evalLlmMockHandler as EvalLlmMockHandler;
			const response = await handler({ url: 'https://slack.com/api/x', method: 'POST' }, {
				name: 'Slack_Tool',
				type: 'n8n-nodes-base.slackTool',
			} as INode);
			// Node code mutates the body it was handed.
			(response?.body as typeof served).output[0].content[0].text = { a: 1 } as never;
			return makeGenerateResult({ toolCalls: [] });
		});
		buildRuntime.mockResolvedValue({ generate, close: vi.fn() });

		const result = await buildService().executeWithLlmMock('agent-1', user, request);

		const recorded = result.toolCalls[0].interceptedRequests?.[0].mockResponse as typeof served;
		expect(recorded.output[0].content[0].text).toBe('{"a":1}');
	});

	it('auto-approves suspended tool calls and flags them', async () => {
		const suspended = makeGenerateResult({
			pendingSuspend: [
				{
					runId: 'run-1',
					toolCallId: 'tc-1',
					toolName: 'Danger_Tool',
					input: {},
					suspendPayload: {},
				},
			],
		});
		const finished = makeGenerateResult({
			toolCalls: [{ tool: 'Danger_Tool', input: {}, output: { done: true } }],
		});
		const generate = vi.fn().mockResolvedValue(suspended);
		const approve = vi.fn().mockResolvedValue(finished);
		buildRuntime.mockResolvedValue({ generate, approve, close: vi.fn() });

		const result = await buildService().executeWithLlmMock('agent-1', user, request);

		expect(approve).toHaveBeenCalledWith(
			'generate',
			expect.objectContaining({ runId: 'run-1', toolCallId: 'tc-1' }),
		);
		expect(generate.mock.calls[0][1].abortSignal).toBe(buildRuntime.mock.calls[0][1]);
		expect(approve.mock.calls[0][1].abortSignal).toBe(buildRuntime.mock.calls[0][1]);
		expect(result.success).toBe(true);
		// Pre-suspension segment calls are preserved alongside the approved one.
		expect(result.toolCalls.find((call) => call.tool === 'Danger_Tool')).toMatchObject({
			autoApproved: true,
		});
	});

	it.each(['construction', 'generation'])(
		'maps a thrown %s failure into an error result and closes an acquired runtime',
		async (stage) => {
			const close = vi.fn().mockResolvedValue(undefined);
			const error = new Error('failed');
			if (stage === 'construction') buildRuntime.mockRejectedValueOnce(error);
			else {
				buildRuntime.mockResolvedValue({
					generate: vi.fn().mockRejectedValue(error),
					close,
				});
			}

			const result = await buildService().executeWithLlmMock('agent-1', user, request);

			expect(result.success).toBe(false);
			const prefix =
				stage === 'construction' ? 'Failed to build agent runtime' : 'Agent run failed';
			expect(result.errors).toEqual([`${prefix}: failed`]);
			expect(close).toHaveBeenCalledTimes(stage === 'construction' ? 0 : 1);
		},
	);

	// Killed for TIME, not by the builder. The harness classifies this off the wording
	// ("exceeded its …s eval budget", `isServerBudgetStop`) and routes it to the timeout
	// path; reported as a plain `Agent run failed:` it scored as a builder verdict —
	// exactly the misattribution the budget plumbing exists to prevent.
	it.each(['construction', 'generation'])(
		'reports a %s budget abort as a timeout and closes runtimes that finish late',
		async (stage) => {
			const construction = createDeferredPromise<RuntimeAgent>();
			const runtime = mock<RuntimeAgent>();
			const generate = runtime.generate.mockImplementation(async (_message, opts) => {
				// What AbortSignal.timeout does once the budget elapses.
				await new Promise((resolve) => setTimeout(resolve, 5));
				throw Object.assign(new Error('The operation was aborted due to timeout'), {
					name: 'TimeoutError',
					signalAborted: opts?.abortSignal?.aborted,
				});
			});
			const close = runtime.close.mockRejectedValue(new Error('teardown failed'));
			if (stage === 'construction') buildRuntime.mockReturnValueOnce(construction.promise);
			else buildRuntime.mockResolvedValue(runtime);

			const result = await buildService().executeWithLlmMock('agent-1', user, {
				...request,
				timeoutMs: 1,
			});

			expect(result.success).toBe(false);
			expect(result.errors[0]).toMatch(/exceeded its \d+s eval budget/);
			expect(result.errors[0]).not.toMatch(/Agent run failed/);
			if (stage === 'construction') {
				construction.resolve(runtime);
				await vi.waitFor(() => expect(close).toHaveBeenCalledTimes(1));
				expect(generate).not.toHaveBeenCalled();
			}
			expect(logger.warn).toHaveBeenCalledWith('[EvalAgentMock] Agent runtime teardown failed', {
				error: 'teardown failed',
			});
		},
		1_000,
	);

	it('flips success off when the run finishes with a model error', async () => {
		buildRuntime.mockResolvedValue({
			generate: vi
				.fn()
				.mockResolvedValue(
					makeGenerateResult({ error: new Error('rate limited'), finishReason: 'error' }),
				),
			close: vi.fn(),
		});

		const result = await buildService().executeWithLlmMock('agent-1', user, request);

		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/Model run error: rate limited/);
	});
});

describe('mcpUrlsMatch', () => {
	it.each([
		['https://mcp.notion.com/mcp', 'https://mcp.notion.com/mcp', true],
		['https://mcp.notion.com/mcp/', 'https://mcp.notion.com/mcp', true],
		['https://mcp.notion.com/mcp/v2', 'https://mcp.notion.com/mcp', true],
		['https://mcp.notion.com/mcp-two', 'https://mcp.notion.com/mcp', false],
		['https://mcp.acme.com', 'https://mcp.acme.com.evil.example/mcp', false],
		['https://mcp.linear.app/mcp', 'https://mcp.notion.com/mcp', false],
	])('%s vs %s -> %s', (configUrl, remoteUrl, expected) => {
		expect(mcpUrlsMatch(configUrl, remoteUrl)).toBe(expected);
		expect(mcpUrlsMatch(remoteUrl, configUrl)).toBe(expected);
	});
});
