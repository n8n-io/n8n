import { z } from 'zod';

import type * as AgentRuntimeModule from '../../runtime/agent-runtime';
import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	INLINE_SUB_AGENT_ID,
	createDelegateSubAgentTool,
	getInlineDelegateSubAgentToolOptions,
	type DelegateSubAgentRunner,
	type DelegateSubAgentRunnerHelpers,
} from '../../runtime/delegate-sub-agent-tool';
import type { BuiltTool } from '../../types';
import { Agent } from '../agent';

const runtimeConfigs: Array<Record<string, unknown>> = [];

vi.mock('../../runtime/agent-runtime', async (importOriginal) => {
	const actual = await importOriginal<typeof AgentRuntimeModule>();
	return {
		...actual,
		AgentRuntime: class MockAgentRuntime {
			constructor(config: Record<string, unknown>) {
				runtimeConfigs.push(config);
			}

			async generate() {
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
					usage: {},
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

describe('delegate sub-agent routing', () => {
	beforeEach(() => {
		runtimeConfigs.length = 0;
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

		await (agent as unknown as { build(): Promise<unknown> }).build();

		expect(runtimeConfigs).toHaveLength(1);
		const builtTools = runtimeConfigs[0]?.tools as BuiltTool[] | undefined;
		const delegateTool = builtTools?.find((tool) => tool.name === DELEGATE_SUB_AGENT_TOOL_NAME);
		expect(delegateTool).toBeDefined();

		await expect(
			delegateTool?.handler?.(delegateInput, { runId: 'parent-run-1' }),
		).resolves.toMatchObject({
			status: 'completed',
			answer: 'inline answer',
		});

		expect(hostRunSubAgent).toHaveBeenCalledOnce();
		expect(hostRunSubAgent.mock.calls[0]?.[1]).toEqual(
			expect.objectContaining({
				runInlineSubAgent: expect.any(Function),
			}),
		);
		expect(runtimeConfigs).toHaveLength(2);
	});

	it('runs inline delegations without a host runner when the tool is built on an Agent', async () => {
		const agent = new Agent('parent')
			.model('openai', 'gpt-4o-mini')
			.instructions('Delegate when needed.')
			.tool(createDelegateSubAgentTool())
			.tool(makeTool('lookup'));

		await (agent as unknown as { build(): Promise<unknown> }).build();

		const builtTools = runtimeConfigs[0]?.tools as BuiltTool[] | undefined;
		const delegateTool = builtTools?.find((tool) => tool.name === DELEGATE_SUB_AGENT_TOOL_NAME);
		expect(delegateTool).toBeDefined();

		await expect(
			delegateTool?.handler?.(delegateInput, { runId: 'parent-run-1' }),
		).resolves.toMatchObject({
			status: 'completed',
			answer: 'inline answer',
		});

		expect(runtimeConfigs).toHaveLength(2);
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
});
