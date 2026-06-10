import { z } from 'zod';

import type * as AgentRuntimeModule from '../../runtime/agent-runtime';
import {
	DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE,
	DELEGATE_SUB_AGENT_TOOL_NAME,
	INLINE_SUB_AGENT_ID,
	createDelegateSubAgentTool,
	getInlineDelegateSubAgentToolOptions,
	type DelegateSubAgentRunner,
	type DelegateSubAgentRunnerHelpers,
} from '../../runtime/delegate-sub-agent-tool';
import type {
	BuiltTool,
	GenerateResult,
	InterruptibleToolContext,
	SerializableAgentState,
} from '../../types';
import { Agent } from '../agent';
import { wrapToolForApproval } from '../tool';

const runtimeConfigs: Array<Record<string, unknown>> = [];
const runtimeGenerateOptions: Array<Record<string, unknown> | undefined> = [];
let inlineChildGenerateResult: GenerateResult | undefined;

const mockState = (): SerializableAgentState => ({
	status: 'success',
	messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
	pendingToolCalls: {},
});

vi.mock('../../runtime/agent-runtime', async (importOriginal) => {
	const actual = await importOriginal<typeof AgentRuntimeModule>();
	return {
		...actual,
		AgentRuntime: class MockAgentRuntime {
			constructor(config: Record<string, unknown>) {
				runtimeConfigs.push(config);
			}

			async generate(_input: unknown, options?: Record<string, unknown>) {
				runtimeGenerateOptions.push(options);
				if (inlineChildGenerateResult !== undefined) {
					return await Promise.resolve(inlineChildGenerateResult);
				}
				return await Promise.resolve({
					runId: 'child-run',
					finishReason: 'stop',
					messages: [
						{
							role: 'assistant',
							type: 'llm',
							content: [{ type: 'text', text: 'inline answer' }],
						},
					],
					usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
					getState: mockState,
				});
			}

			async dispose() {
				return await Promise.resolve();
			}
		},
	};
});

function makeTool(name: string): BuiltTool {
	return {
		name,
		description: `${name} tool`,
		inputSchema: z.object({}),
		handler: async () => await Promise.resolve({ ok: true }),
	};
}

const delegateInput = {
	subAgentId: INLINE_SUB_AGENT_ID,
	taskName: 'Research API',
	goal: 'Find the API behavior.',
};

async function buildAgentConfig(agent: Agent): Promise<AgentRuntimeModule.AgentRuntimeConfig> {
	return await (
		agent as unknown as { build(): Promise<AgentRuntimeModule.AgentRuntimeConfig> }
	).build();
}

describe('delegate sub-agent routing', () => {
	beforeEach(() => {
		runtimeConfigs.length = 0;
		runtimeGenerateOptions.length = 0;
		inlineChildGenerateResult = undefined;
	});

	it('routes inline delegations through a host runner with runInlineSubAgent helpers', async () => {
		const hostRunSubAgent = vi.fn<DelegateSubAgentRunner>(async (request, helpers) => {
			expect(request.subAgentId).toBe(INLINE_SUB_AGENT_ID);
			return await helpers.runInlineSubAgent(request);
		});

		const agent = new Agent('parent')
			.model('openai', 'gpt-4o-mini')
			.instructions('Delegate when needed.')
			.tool(
				createDelegateSubAgentTool({
					runSubAgent: hostRunSubAgent,
				}),
			)
			.tool(makeTool('lookup'));

		const runtimeConfig = await buildAgentConfig(agent);

		expect(runtimeConfigs).toHaveLength(0);
		const builtTools = runtimeConfig.tools;
		const delegateTool = builtTools?.find((tool) => tool.name === DELEGATE_SUB_AGENT_TOOL_NAME);
		expect(delegateTool).toBeDefined();

		await expect(
			delegateTool?.handler?.(delegateInput, { runId: 'parent-run-1' }),
		).resolves.toMatchObject({
			status: 'completed',
			answer: 'inline answer',
		});

		expect(hostRunSubAgent).toHaveBeenCalledOnce();
		const helpers = hostRunSubAgent.mock.calls[0]?.[1];
		expect(helpers).toBeDefined();
		expect(typeof helpers?.runInlineSubAgent).toBe('function');
		expect(runtimeConfigs).toHaveLength(1);
	});

	it('runs inline delegations without a host runner when the tool is built on an Agent', async () => {
		const agent = new Agent('parent')
			.model('openai', 'gpt-4o-mini')
			.instructions('Delegate when needed.')
			.tool(createDelegateSubAgentTool())
			.tool(makeTool('lookup'));

		const runtimeConfig = await buildAgentConfig(agent);

		expect(runtimeConfigs).toHaveLength(0);
		const builtTools = runtimeConfig.tools;
		const delegateTool = builtTools?.find((tool) => tool.name === DELEGATE_SUB_AGENT_TOOL_NAME);
		expect(delegateTool).toBeDefined();

		await expect(
			delegateTool?.handler?.(delegateInput, { runId: 'parent-run-1' }),
		).resolves.toMatchObject({
			status: 'completed',
			answer: 'inline answer',
		});

		expect(runtimeConfigs).toHaveLength(1);
	});

	it('uses a mapped inline model when difficulty is configured', async () => {
		const agent = new Agent('parent')
			.model('openai', 'gpt-4o-mini')
			.instructions('Delegate when needed.')
			.tool(
				createDelegateSubAgentTool({
					inlineSubAgentModelsByDifficulty: {
						high: 'anthropic/claude-sonnet-4-5',
					},
				}),
			)
			.tool(makeTool('lookup'));

		const runtimeConfig = await buildAgentConfig(agent);
		const delegateTool = runtimeConfig.tools?.find(
			(tool) => tool.name === DELEGATE_SUB_AGENT_TOOL_NAME,
		);
		expect(delegateTool).toBeDefined();

		await delegateTool?.handler?.(
			{ ...delegateInput, difficulty: 'high' },
			{ runId: 'parent-run-1' },
		);

		expect(runtimeConfigs).toHaveLength(1);
		expect(runtimeConfigs[0]?.model).toBe('anthropic/claude-sonnet-4-5');
	});

	it('falls back to the parent model when difficulty is omitted or unmapped', async () => {
		const agent = new Agent('parent')
			.model('openai', 'gpt-4o-mini')
			.instructions('Delegate when needed.')
			.tool(
				createDelegateSubAgentTool({
					inlineSubAgentModelsByDifficulty: {
						high: 'anthropic/claude-sonnet-4-5',
					},
				}),
			)
			.tool(makeTool('lookup'));

		const runtimeConfig = await buildAgentConfig(agent);
		const delegateTool = runtimeConfig.tools?.find(
			(tool) => tool.name === DELEGATE_SUB_AGENT_TOOL_NAME,
		);
		expect(delegateTool).toBeDefined();

		await delegateTool?.handler?.(delegateInput, { runId: 'parent-run-1' });
		expect(runtimeConfigs[0]?.model).toBe('openai/gpt-4o-mini');

		runtimeConfigs.length = 0;
		await delegateTool?.handler?.(
			{ ...delegateInput, difficulty: 'low' },
			{ runId: 'parent-run-1' },
		);
		expect(runtimeConfigs[0]?.model).toBe('openai/gpt-4o-mini');
	});

	it('passes the parent execution counter to inline child generate options', async () => {
		const executionCounter = {
			incrementMessageCount: vi.fn(),
			incrementToolCallCount: vi.fn(),
			incrementTokenCount: vi.fn(),
		};
		const agent = new Agent('parent')
			.model('openai', 'gpt-4o-mini')
			.instructions('Delegate when needed.')
			.tool(createDelegateSubAgentTool())
			.tool(makeTool('lookup'));

		const runtimeConfig = await buildAgentConfig(agent);
		const delegateTool = runtimeConfig.tools?.find(
			(tool) => tool.name === DELEGATE_SUB_AGENT_TOOL_NAME,
		);
		expect(delegateTool).toBeDefined();

		await delegateTool?.handler?.(delegateInput, {
			runId: 'parent-run-1',
			executionCounter,
		});

		expect(runtimeGenerateOptions[0]).toEqual(expect.objectContaining({ executionCounter }));
	});

	it('preserves required approval when completing inline delegate tools', async () => {
		const agent = new Agent('parent')
			.model('openai', 'gpt-4o-mini')
			.instructions('Delegate when needed.')
			.checkpoint('memory')
			.tool(wrapToolForApproval(createDelegateSubAgentTool(), { requireApproval: true }))
			.tool(makeTool('lookup'));

		const runtimeConfig = await buildAgentConfig(agent);

		expect(runtimeConfigs).toHaveLength(0);
		const builtTools = runtimeConfig.tools;
		const delegateTool = builtTools?.find((tool) => tool.name === DELEGATE_SUB_AGENT_TOOL_NAME);
		expect(delegateTool?.approval?.required).toBe(true);

		const suspend = vi.fn(async (payload: unknown) => {
			return await Promise.resolve({ suspended: payload });
		});
		await delegateTool?.handler?.(delegateInput, {
			suspend: suspend as unknown as InterruptibleToolContext['suspend'],
			resumeData: undefined,
			runId: 'parent-run-1',
		});

		expect(suspend).toHaveBeenCalledWith({
			type: 'approval',
			toolName: DELEGATE_SUB_AGENT_TOOL_NAME,
			args: delegateInput,
		});
		expect(runtimeConfigs).toHaveLength(0);
	});

	it('lets a host-style runner delegate inline through helpers from tool metadata', async () => {
		const runInlineSubAgent = vi
			.fn<DelegateSubAgentRunnerHelpers['runInlineSubAgent']>()
			.mockResolvedValue({
				status: 'completed',
				taskPath: '/root/research_api_0',
				answer: 'inline via helper',
			});
		const hostRunSubAgent = vi.fn<DelegateSubAgentRunner>(async (request, helpers) => {
			if (request.subAgentId === INLINE_SUB_AGENT_ID) {
				return await helpers.runInlineSubAgent(request);
			}
			return {
				status: 'failed',
				taskPath: request.taskPath,
				answer: '',
				error: 'unexpected',
			};
		});

		const tool = createDelegateSubAgentTool({ runSubAgent: hostRunSubAgent });
		const options = getInlineDelegateSubAgentToolOptions(tool);
		expect(options?.runSubAgent).toBe(hostRunSubAgent);

		await expect(
			options?.runSubAgent?.(
				{
					...delegateInput,
					taskPath: '/root/research_api_0',
					childCount: 0,
				},
				{ runInlineSubAgent },
			),
		).resolves.toMatchObject({
			status: 'completed',
			answer: 'inline via helper',
		});

		expect(runInlineSubAgent).toHaveBeenCalledOnce();
	});

	it('returns a failed delegate output when an inline child run suspends', async () => {
		inlineChildGenerateResult = {
			runId: 'child-run-suspended',
			finishReason: 'tool-calls',
			messages: [
				{
					role: 'assistant',
					type: 'llm',
					content: [{ type: 'text', text: 'awaiting approval' }],
				},
			],
			pendingSuspend: [
				{
					runId: 'child-run-suspended',
					toolCallId: 'tool-call-1',
					toolName: 'delete_file',
					input: { path: '/tmp/foo.txt' },
					suspendPayload: { message: 'Delete file?' },
				},
			],
			getState: mockState,
		};

		const agent = new Agent('parent')
			.model('openai', 'gpt-4o-mini')
			.instructions('Delegate when needed.')
			.tool(createDelegateSubAgentTool())
			.tool(makeTool('lookup'));

		const runtimeConfig = await buildAgentConfig(agent);

		const builtTools = runtimeConfig.tools;
		const delegateTool = builtTools?.find((tool) => tool.name === DELEGATE_SUB_AGENT_TOOL_NAME);
		expect(delegateTool).toBeDefined();

		await expect(
			delegateTool?.handler?.(delegateInput, { runId: 'parent-run-1' }),
		).resolves.toMatchObject({
			status: 'failed',
			answer: '',
			error: DELEGATED_CHILD_SUSPEND_UNSUPPORTED_MESSAGE,
		});
	});
});
