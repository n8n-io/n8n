import type { BuiltAgent, GenerateResult } from '../../types/sdk/agent';
import {
	DELEGATE_SUB_AGENT_TOOL_NAME,
	createDelegateSubAgentTool,
	type DelegateSubAgentRequest,
	type DelegateSubAgentToolOutput,
} from '../delegate-sub-agent-tool';

const input = {
	taskName: 'Research API',
	goal: 'Find the API behavior.',
	context: 'Focus on auth endpoints.',
	expectedOutput: 'A short summary.',
};

describe('createDelegateSubAgentTool', () => {
	it('creates the delegate_subagent tool', () => {
		const tool = createDelegateSubAgentTool({
			runSubAgent: async () =>
				await Promise.resolve({
					status: 'completed',
					taskPath: '/root/research_api',
					runId: 'child-run-1',
					answer: 'done',
				}),
		});

		expect(tool.name).toBe(DELEGATE_SUB_AGENT_TOOL_NAME);
		expect(tool.description).toContain('Delegate');
		expect(tool.inputSchema).toBeDefined();
		expect(tool.outputSchema).toBeDefined();
	});

	it('passes model input and parent runtime context to the runner callback', async () => {
		const runSubAgent = jest
			.fn<Promise<DelegateSubAgentToolOutput>, [DelegateSubAgentRequest]>()
			.mockResolvedValue({
				status: 'completed',
				taskPath: '/root/research_api',
				runId: 'child-run-1',
				answer: 'done',
			});
		const tool = createDelegateSubAgentTool({
			parentTaskPath: '/root',
			policy: { maxChildren: 2 },
			runSubAgent,
		});

		await tool.handler?.(input, {
			runId: 'parent-run-1',
			toolCallId: 'tool-call-1',
		});

		expect(runSubAgent).toHaveBeenCalledWith({
			...input,
			taskPath: '/root/research_api',
			parentRunId: 'parent-run-1',
			parentToolCallId: 'tool-call-1',
			parentTaskPath: '/root',
			childCount: 0,
			policy: { maxChildren: 2 },
		});
	});

	it('runs a provided child agent by default', async () => {
		const childResult: GenerateResult = {
			runId: 'child-run-1',
			messages: [
				{
					role: 'assistant',
					type: 'llm',
					content: [{ type: 'text', text: 'child answer' }],
				},
			],
			finishReason: 'stop',
			usage: {
				promptTokens: 3,
				completionTokens: 2,
				totalTokens: 5,
			},
		};
		const child = makeBuiltAgent(childResult);
		const tool = createDelegateSubAgentTool({
			agent: child,
			generateOptions: { maxIterations: 2 },
		});

		await expect(tool.handler?.(input, { runId: 'parent-run-1' })).resolves.toMatchObject({
			status: 'completed',
			taskPath: '/root/research_api',
			runId: 'child-run-1',
			answer: 'child answer',
			usage: {
				totalTokens: 5,
			},
			finishReason: 'stop',
		});
		expect(child.generate).toHaveBeenCalledWith(
			[
				'Goal:\nFind the API behavior.',
				'Context:\nFocus on auth endpoints.',
				'Expected output:\nA short summary.',
			].join('\n\n'),
			{ maxIterations: 2 },
		);
	});

	it('tracks child count per parent run id', async () => {
		const runSubAgent = jest
			.fn<Promise<DelegateSubAgentToolOutput>, [DelegateSubAgentRequest]>()
			.mockResolvedValue({
				status: 'completed',
				taskPath: '/root/research_api',
				runId: 'child-run-1',
				answer: 'done',
			});
		const tool = createDelegateSubAgentTool({
			policy: { maxChildren: 1 },
			runSubAgent,
		});

		await expect(tool.handler?.(input, { runId: 'parent-run-1' })).resolves.toMatchObject({
			status: 'completed',
		});
		await expect(tool.handler?.(input, { runId: 'parent-run-1' })).resolves.toMatchObject({
			status: 'failed',
			error: 'Sub-agent child count 2 exceeds maxChildren 1',
		});
		await expect(tool.handler?.(input, { runId: 'parent-run-2' })).resolves.toMatchObject({
			status: 'completed',
		});

		expect(runSubAgent).toHaveBeenCalledTimes(2);
	});

	it('returns a failed output when the runner callback throws', async () => {
		const tool = createDelegateSubAgentTool({
			runSubAgent: async () => await Promise.reject(new Error('Runner failed')),
		});

		await expect(tool.handler?.(input, { runId: 'parent-run-1' })).resolves.toMatchObject({
			status: 'failed',
			taskPath: '/root/research_api',
			answer: '',
			error: 'Runner failed',
		});
	});

	it('returns a failed output for invalid task names', async () => {
		const runSubAgent = jest.fn();
		const tool = createDelegateSubAgentTool({ runSubAgent });

		await expect(
			tool.handler?.({ ...input, taskName: '!!!' }, { runId: 'parent-run-1' }),
		).resolves.toMatchObject({
			status: 'failed',
			answer: '',
			error: 'Sub-agent task name must contain at least one alphanumeric character',
		});
		expect(runSubAgent).not.toHaveBeenCalled();
	});
});

function makeBuiltAgent(result: GenerateResult): jest.Mocked<BuiltAgent> {
	return {
		name: 'child',
		generate: jest.fn().mockResolvedValue(result),
		stream: jest.fn(),
		on: jest.fn(),
		getState: jest.fn(),
		abort: jest.fn(),
		resume: jest.fn(),
		approve: jest.fn(),
		deny: jest.fn(),
	} as unknown as jest.Mocked<BuiltAgent>;
}
