import type { GenerateResult } from '@n8n/agents';
import type { AgentJsonConfig } from '@n8n/api-types';
import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { OutboundHttp } from '@n8n/backend-network';
import type { ExecutionsConfig } from '@n8n/config';
import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { EvalLlmMockHandler } from 'n8n-core';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { AgentEvaluationService } from '@/modules/agents/evaluation/agent-evaluation.service';
import type { AgentEvaluationPreparation } from '@/modules/agents/evaluation/agent-evaluation.contracts';

import { EvalAgentExecutionService, mcpUrlsMatch } from '../agent-execution.service';
import { generateAgentScenarioSeed } from '../agent-scenario-seed';
import { createMcpMockFetch } from '../mcp-mock-fetch';
import { createLlmMockHandler } from '../mock-handler';

vi.mock('@/modules/agents/evaluation/agent-evaluation.service', () => ({
	AgentEvaluationService: class AgentEvaluationService {},
}));
vi.mock('@/utils/ai-proxy-fetch', () => ({ createAiProxyFetch: vi.fn(() => vi.fn()) }));
vi.mock('../agent-scenario-seed', () => ({ generateAgentScenarioSeed: vi.fn() }));
vi.mock('../mcp-mock-fetch', () => ({ createMcpMockFetch: vi.fn(() => vi.fn()) }));
vi.mock('../mock-handler', () => ({ createLlmMockHandler: vi.fn() }));

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
		expect(result.success).toBe(true);
		// Pre-suspension segment calls are preserved alongside the approved one.
		expect(result.toolCalls.find((call) => call.tool === 'Danger_Tool')).toMatchObject({
			autoApproved: true,
		});
	});

	it('maps a thrown run failure into an error result and still closes the runtime', async () => {
		const close = vi.fn().mockResolvedValue(undefined);
		buildRuntime.mockResolvedValue({
			generate: vi.fn().mockRejectedValue(new Error('aborted')),
			close,
		});

		const result = await buildService().executeWithLlmMock('agent-1', user, request);

		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/Agent run failed: aborted/);
		expect(close).toHaveBeenCalledTimes(1);
	});

	// Killed for TIME, not by the builder. The harness classifies this off the wording
	// ("exceeded its …s eval budget", `isServerBudgetStop`) and routes it to the timeout
	// path; reported as a plain `Agent run failed:` it scored as a builder verdict —
	// exactly the misattribution the budget plumbing exists to prevent.
	it('reports a budget abort in the words the harness classifies as a timeout', async () => {
		buildRuntime.mockResolvedValue({
			generate: vi.fn().mockImplementation(async (_message, opts: { abortSignal: AbortSignal }) => {
				// What AbortSignal.timeout does once the budget elapses.
				await new Promise((resolve) => setTimeout(resolve, 5));
				throw Object.assign(new Error('The operation was aborted due to timeout'), {
					name: 'TimeoutError',
					signalAborted: opts.abortSignal.aborted,
				});
			}),
			close: vi.fn().mockResolvedValue(undefined),
		});

		const result = await buildService().executeWithLlmMock('agent-1', user, {
			...request,
			timeoutMs: 1,
		});

		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/exceeded its \d+s eval budget/);
		expect(result.errors[0]).not.toMatch(/Agent run failed/);
	});

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
