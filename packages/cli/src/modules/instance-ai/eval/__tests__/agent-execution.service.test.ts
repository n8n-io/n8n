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

import type { CredentialsService } from '@/credentials/credentials.service';
import { AgentRuntimeReconstructionService } from '@/modules/agents/agent-runtime-reconstruction.service';
import type { Agent as AgentEntity } from '@/modules/agents/entities/agent.entity';
import { AgentRepository } from '@/modules/agents/repositories/agent.repository';
import { userHasScopes } from '@/permissions.ee/check-access';

import {
	EvalAgentExecutionService,
	mcpUrlsMatch,
	pruneConfigForEval,
	summarizeTools,
} from '../agent-execution.service';
import { generateAgentScenarioSeed } from '../agent-scenario-seed';
import { createLlmMockHandler } from '../mock-handler';

// The service resolves the agents-module surface lazily; top-level vi.mock
// keeps those specifiers from loading the real module graph (and avoids the
// doMock+dynamic-import concurrency flake). The static imports above resolve
// to these factories.
vi.mock('@/modules/agents/repositories/agent.repository', () => ({
	AgentRepository: class AgentRepository {},
}));
vi.mock('@/modules/agents/agent-runtime-reconstruction.service', () => ({
	AgentRuntimeReconstructionService: class AgentRuntimeReconstructionService {},
}));
vi.mock('@/modules/agents/utils/agent-credential-provider', () => ({
	createAgentCredentialProvider: vi.fn(() => ({ resolve: vi.fn() })),
}));
vi.mock('@/modules/agents/json-config/agent-config-composition', () => ({
	sanitizeToolName: (name: string) => name.replace(/[^a-zA-Z0-9_-]+/g, '_'),
}));
vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));
vi.mock('@/utils/ai-proxy-fetch', () => ({ createAiProxyFetch: vi.fn(() => vi.fn()) }));
vi.mock('../agent-scenario-seed', () => ({ generateAgentScenarioSeed: vi.fn() }));
vi.mock('../mock-handler', () => ({ createLlmMockHandler: vi.fn() }));

const logger = mock<Logger>();
const user = mock<User>();

const findByIdAndProjectId = vi.fn();
const reconstructFromAgentEntity = vi.fn();

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

const makeEntity = (config: AgentJsonConfig, integrations: unknown[] = []): AgentEntity =>
	({
		id: 'agent-1',
		projectId: 'proj-1',
		schema: config,
		tools: {
			't-1': { code: 'export default 1', descriptor: { name: 'my_custom', description: 'Custom' } },
		},
		skills: {},
		integrations,
	}) as unknown as AgentEntity;

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

function buildService(overrides: { queueMode?: boolean; agentsActive?: boolean } = {}) {
	const executionsConfig = mock<ExecutionsConfig>();
	Object.defineProperty(executionsConfig, 'mode', {
		get: () => (overrides.queueMode ? 'queue' : 'regular'),
	});
	const moduleRegistry = mock<ModuleRegistry>();
	moduleRegistry.isActive.mockReturnValue(overrides.agentsActive ?? true);
	return new EvalAgentExecutionService(
		logger,
		executionsConfig,
		moduleRegistry,
		mock<OutboundHttp>(),
		mock<CredentialsService>(),
	);
}

describe('EvalAgentExecutionService.executeWithLlmMock', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		Container.set(AgentRepository, { findByIdAndProjectId } as unknown as AgentRepository);
		Container.set(AgentRuntimeReconstructionService, {
			reconstructFromAgentEntity,
		} as unknown as AgentRuntimeReconstructionService);
		vi.mocked(userHasScopes).mockResolvedValue(true);
		vi.mocked(generateAgentScenarioSeed).mockResolvedValue(seed);
		vi.mocked(createLlmMockHandler).mockReturnValue(
			vi.fn().mockResolvedValue({ body: { ok: true }, statusCode: 200, headers: {} }),
		);
		findByIdAndProjectId.mockResolvedValue(makeEntity({ ...baseConfig }));
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
		expect(findByIdAndProjectId).not.toHaveBeenCalled();
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
		vi.mocked(userHasScopes).mockResolvedValue(false);
		const result = await buildService().executeWithLlmMock('agent-1', user, request);
		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/not found or not accessible/);
	});

	it('reports not-found when the agent does not exist in the project', async () => {
		findByIdAndProjectId.mockResolvedValue(null);
		const result = await buildService().executeWithLlmMock('agent-1', user, request);
		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/not found or not accessible/);
	});

	it('reports a config-less agent', async () => {
		findByIdAndProjectId.mockResolvedValue(makeEntity(undefined as unknown as AgentJsonConfig));
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
		expect(reconstructFromAgentEntity).not.toHaveBeenCalled();
	});

	it('runs the happy path: real-model turn, mocked tool HTTP, mapped result', async () => {
		const innerCredentialsHelper = { getDecrypted: vi.fn() };
		const close = vi.fn().mockResolvedValue(undefined);
		const generate = vi.fn().mockImplementation(async () => {
			// Simulate a node-tool invocation mid-run: the instrumentation must
			// swap the credentials helper and serve HTTP through the mock.
			const instrumentation = reconstructFromAgentEntity.mock.calls[0][4] as {
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
		reconstructFromAgentEntity.mockResolvedValue({ agent: { generate, close }, toolRegistry: {} });

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

		// The runtime was built with the eval instrumentation, uncached.
		const [entityArg, , integrationType, userArg, instrumentation] = reconstructFromAgentEntity.mock
			.calls[0] as [AgentEntity, unknown, string | undefined, User, { modelFetch?: unknown }];
		expect(entityArg.id).toBe('agent-1');
		expect(integrationType).toBeUndefined();
		expect(userArg).toBe(user);
		expect(instrumentation.modelFetch).toBeDefined();
	});

	it('prunes unmockable features and reports them', async () => {
		const fullConfig = {
			...baseConfig,
			memory: { enabled: true },
			vectorStores: [{ provider: 'pinecone' }],
			mcpServers: [{ name: 'mcp-1', url: 'https://legacy.example/sse', transport: 'sse' }],
			subAgents: { agents: [{ agentId: 'child-1' }] },
		} as unknown as AgentJsonConfig;
		findByIdAndProjectId.mockResolvedValue(makeEntity(fullConfig, [{ type: 'slack' }]));
		reconstructFromAgentEntity.mockResolvedValue({
			agent: { generate: vi.fn().mockResolvedValue(makeGenerateResult()), close: vi.fn() },
			toolRegistry: {},
		});

		const result = await buildService().executeWithLlmMock('agent-1', user, request);

		expect(result.skippedFeatures.map((entry) => entry.feature).sort()).toEqual([
			'integrations',
			'mcpServers (sse transport)',
			'memory',
			'vectorStores',
		]);
		const rebuiltEntity = reconstructFromAgentEntity.mock.calls[0][0] as AgentEntity;
		expect(rebuiltEntity.schema?.memory).toBeUndefined();
		expect(rebuiltEntity.schema?.mcpServers).toBeUndefined();
		// Configured sub-agents are kept — the delegated child inherits the
		// instrumentation and its config is pruned via the transform hook.
		expect(rebuiltEntity.schema?.subAgents).toEqual({ agents: [{ agentId: 'child-1' }] });
	});

	it('serves fallback web search and configured sub-agents through the instrumentation', async () => {
		const fullConfig = {
			...baseConfig,
			model: 'mistral/mistral-large',
			config: { webSearch: { enabled: true, provider: 'brave', credential: 'cred-2' } },
			subAgents: { agents: [{ agentId: 'child-1' }] },
		} as unknown as AgentJsonConfig;
		findByIdAndProjectId.mockResolvedValue(makeEntity(fullConfig));
		reconstructFromAgentEntity.mockResolvedValue({
			agent: { generate: vi.fn().mockResolvedValue(makeGenerateResult()), close: vi.fn() },
			toolRegistry: {},
		});

		const result = await buildService().executeWithLlmMock('agent-1', user, request);

		const instrumentation = reconstructFromAgentEntity.mock.calls[0][4] as {
			webSearch?: unknown;
			transformDelegatedAgentConfig?: (
				config: AgentJsonConfig,
				context: { subAgentId: string },
			) => AgentJsonConfig;
		};
		expect(instrumentation.webSearch).toBeDefined();
		expect(result.skippedFeatures).toEqual([]);

		// Delegated child configs get the same pruning, reported under the child id
		// (the returned skippedFeatures array is live for the duration of the run).
		const childConfig = {
			...baseConfig,
			memory: { enabled: true },
		} as unknown as AgentJsonConfig;
		const prunedChild = instrumentation.transformDelegatedAgentConfig?.(childConfig, {
			subAgentId: 'child-1',
		});
		expect(prunedChild?.memory).toBeUndefined();
		expect(result.skippedFeatures.map((entry) => entry.feature)).toContain(
			'subAgent child-1: memory',
		);
	});

	it('surfaces errored tool calls omitted from the run result via the intercepted ledger', async () => {
		// Node tools throw on failure and the SDK drops them from
		// GenerateResult.toolCalls — the intercepted request (e.g. an injected
		// channel_not_found) must still reach the judge.
		const generate = vi.fn().mockImplementation(async () => {
			const instrumentation = reconstructFromAgentEntity.mock.calls[0][4] as {
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
		reconstructFromAgentEntity.mockResolvedValue({
			agent: { generate, close: vi.fn() },
			toolRegistry: {},
		});

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
		reconstructFromAgentEntity.mockResolvedValue({
			agent: { generate, approve, close: vi.fn() },
			toolRegistry: {},
		});

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
		reconstructFromAgentEntity.mockResolvedValue({
			agent: { generate: vi.fn().mockRejectedValue(new Error('aborted')), close },
			toolRegistry: {},
		});

		const result = await buildService().executeWithLlmMock('agent-1', user, request);

		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/Agent run failed: aborted/);
		expect(close).toHaveBeenCalledTimes(1);
	});

	it('flips success off when the run finishes with a model error', async () => {
		reconstructFromAgentEntity.mockResolvedValue({
			agent: {
				generate: vi
					.fn()
					.mockResolvedValue(
						makeGenerateResult({ error: new Error('rate limited'), finishReason: 'error' }),
					),
				close: vi.fn(),
			},
			toolRegistry: {},
		});

		const result = await buildService().executeWithLlmMock('agent-1', user, request);

		expect(result.success).toBe(false);
		expect(result.errors[0]).toMatch(/Model run error: rate limited/);
	});
});

describe('pruneConfigForEval', () => {
	it('leaves a plain tools-only config untouched', () => {
		const { config, skippedFeatures } = pruneConfigForEval({ ...baseConfig });
		expect(skippedFeatures).toEqual([]);
		expect(config.tools).toEqual(baseConfig.tools);
	});

	it('keeps streamable-HTTP MCP servers and strips only SSE-transport ones', () => {
		const withMcp = {
			...baseConfig,
			mcpServers: [
				{ name: 'acme_kb', url: 'https://mcp.acme-kb.example/mcp', transport: 'streamableHttp' },
				{ name: 'legacy', url: 'https://legacy.example/sse', transport: 'sse' },
			],
		} as unknown as AgentJsonConfig;

		const { config, skippedFeatures } = pruneConfigForEval(withMcp);

		expect(config.mcpServers?.map((server) => server.name)).toEqual(['acme_kb']);
		expect(skippedFeatures).toHaveLength(1);
		expect(skippedFeatures[0].feature).toContain('sse');
		expect(skippedFeatures[0].reason).toContain('legacy');
	});

	it('keeps fallback web search — the web-search mock serves it', () => {
		const withSearch = {
			...baseConfig,
			model: 'mistral/mistral-large',
			config: { webSearch: { enabled: true, provider: 'brave', credential: 'cred-2' } },
		} as unknown as AgentJsonConfig;

		const { config, skippedFeatures } = pruneConfigForEval(withSearch);

		expect(skippedFeatures).toHaveLength(0);
		expect(config.config?.webSearch?.enabled).toBe(true);
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

describe('summarizeTools', () => {
	it('summarizes the fallback web_search tool so the seed can steer it', () => {
		const config = {
			...baseConfig,
			model: 'mistral/mistral-large',
			config: { webSearch: { enabled: true, provider: 'brave', credential: 'cred-2' } },
		} as unknown as AgentJsonConfig;

		const summaries = summarizeTools(config, {}, (name) => name);

		expect(summaries.find((entry) => entry.name === 'web_search')?.kind).toBe('other');
	});

	it('summarizes MCP servers by server name with kind mcp', () => {
		const config = {
			...baseConfig,
			tools: [],
			mcpServers: [
				{ name: 'acme_kb', url: 'https://mcp.acme-kb.example/mcp', description: 'KB server' },
			],
		} as unknown as AgentJsonConfig;

		const summaries = summarizeTools(config, {} as never, (name) => name);
		expect(summaries).toEqual([{ name: 'acme_kb', kind: 'mcp', description: 'KB server' }]);
	});

	it('maps node, workflow, and custom tools with sanitized names', () => {
		const config = {
			...baseConfig,
			tools: [
				...(baseConfig.tools ?? []),
				{ type: 'workflow', workflow: 'Order lookup', description: 'Find an order' },
				{ type: 'custom', id: 't-1' },
			],
		} as unknown as AgentJsonConfig;
		const customTools = {
			't-1': { code: '', descriptor: { name: 'my_custom', description: 'Custom' } },
		} as unknown as NonNullable<AgentEntity['tools']>;

		const summaries = summarizeTools(config, customTools, (name) =>
			name.replace(/[^a-zA-Z0-9_-]+/g, '_'),
		);

		expect(summaries).toEqual([
			{
				name: 'Slack_Tool',
				kind: 'node',
				description: undefined,
				nodeType: 'n8n-nodes-base.slackTool',
			},
			{ name: 'Order_lookup', kind: 'workflow', description: 'Find an order' },
			{ name: 'my_custom', kind: 'custom', description: 'Custom' },
		]);
	});
});
