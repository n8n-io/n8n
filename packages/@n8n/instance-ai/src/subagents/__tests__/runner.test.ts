import { INLINE_SUB_AGENT_ID, type DelegateSubAgentRequest } from '@n8n/agents';

import { createToolRegistry } from '../../tool-registry';
import { runSyncSubAgent } from '../../tools/orchestration/sync-sub-agent';
import type { OrchestrationContext } from '../../types';
import { runInstanceAiSubAgent } from '../runner';

vi.mock('../../tools/orchestration/sync-sub-agent', () => ({ runSyncSubAgent: vi.fn() }));

const runSyncSubAgentMock = vi.mocked(runSyncSubAgent);

function createMockContext(domainTools: Record<string, unknown> = {}): OrchestrationContext {
	return {
		domainTools: createToolRegistry(
			Object.entries(domainTools).map(([name, tool]) => [
				name,
				{
					name,
					description: name,
					handler: async () => await Promise.resolve({}),
					...(tool as object),
				},
			]),
		),
	} as unknown as OrchestrationContext;
}

function baseRequest(overrides: Partial<DelegateSubAgentRequest> = {}): DelegateSubAgentRequest {
	return {
		subAgentId: INLINE_SUB_AGENT_ID,
		taskName: 'task',
		goal: 'Find the thing.',
		taskPath: '/root/task_0',
		childCount: 0,
		...overrides,
	};
}

beforeEach(() => {
	runSyncSubAgentMock.mockReset();
});

describe('runInstanceAiSubAgent', () => {
	it('maps "inline" to the general-purpose definition', async () => {
		runSyncSubAgentMock.mockResolvedValue({ result: 'done' });
		const context = createMockContext({
			nodes: {},
			credentials: {},
			research: {},
			workflows: {},
			executions: {},
		});

		await runInstanceAiSubAgent(baseRequest(), context);

		expect(runSyncSubAgentMock).toHaveBeenCalledTimes(1);
		expect(runSyncSubAgentMock.mock.calls[0][1]).toMatchObject({ role: 'general-purpose' });
	});

	it('routes a selectable configured id to its definition', async () => {
		runSyncSubAgentMock.mockResolvedValue({ result: 'explored' });
		const context = createMockContext({ nodes: {}, research: {}, workflows: {} });

		const output = await runInstanceAiSubAgent(
			baseRequest({ subAgentId: 'instance-explorer' }),
			context,
		);

		expect(runSyncSubAgentMock.mock.calls[0][1]).toMatchObject({ role: 'instance-explorer' });
		expect(output).toMatchObject({
			status: 'completed',
			answer: 'explored',
			taskPath: '/root/task_0',
		});
	});

	it('fails without calling runSyncSubAgent for an unknown subAgentId', async () => {
		const context = createMockContext({});

		const output = await runInstanceAiSubAgent(
			baseRequest({ subAgentId: 'does-not-exist' }),
			context,
		);

		expect(runSyncSubAgentMock).not.toHaveBeenCalled();
		expect(output).toMatchObject({ status: 'failed', answer: '', taskPath: '/root/task_0' });
		expect(output.error).toContain('does-not-exist');
		expect(output.error).toContain('instance-explorer');
	});

	it('rejects workflow-context-scout as a direct subAgentId (single route via discover-workflow-context)', async () => {
		const context = createMockContext({});

		const output = await runInstanceAiSubAgent(
			baseRequest({ subAgentId: 'workflow-context-scout' }),
			context,
		);

		expect(runSyncSubAgentMock).not.toHaveBeenCalled();
		expect(output.status).toBe('failed');
	});

	it('rejects general-purpose as a direct subAgentId (only reachable via "inline")', async () => {
		const context = createMockContext({});

		const output = await runInstanceAiSubAgent(
			baseRequest({ subAgentId: 'general-purpose' }),
			context,
		);

		expect(runSyncSubAgentMock).not.toHaveBeenCalled();
		expect(output.status).toBe('failed');
	});

	it('forwards request.context as conversationContext and includes expectedOutput in the briefing', async () => {
		runSyncSubAgentMock.mockResolvedValue({ result: 'done' });
		const context = createMockContext({});

		await runInstanceAiSubAgent(
			baseRequest({ context: 'prior findings', expectedOutput: 'a short summary' }),
			context,
		);

		const callArg = runSyncSubAgentMock.mock.calls[0][1];
		expect(callArg.conversationContext).toBe('prior findings');
		expect(callArg.briefing).toContain('Find the thing.');
		expect(callArg.briefing).toContain('a short summary');
	});

	it('maps usage through to the delegate output when present', async () => {
		runSyncSubAgentMock.mockResolvedValue({
			result: 'done',
			usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0.01 },
		});
		const context = createMockContext({});

		const output = await runInstanceAiSubAgent(baseRequest(), context);

		expect(output.usage).toEqual({
			promptTokens: 10,
			completionTokens: 5,
			totalTokens: 15,
			cost: 0.01,
		});
	});

	it('omits usage when runSyncSubAgent reports none', async () => {
		runSyncSubAgentMock.mockResolvedValue({ result: 'done' });
		const context = createMockContext({});

		const output = await runInstanceAiSubAgent(baseRequest(), context);

		expect(output.usage).toBeUndefined();
	});

	it('never returns a suspended status', async () => {
		runSyncSubAgentMock.mockResolvedValue({ result: 'done' });
		const context = createMockContext({});

		const output = await runInstanceAiSubAgent(baseRequest(), context);

		expect(output.status).not.toBe('suspended');
	});

	it('passes definition maxSteps as maxIterations', async () => {
		runSyncSubAgentMock.mockResolvedValue({ result: 'done' });
		const context = createMockContext({});

		await runInstanceAiSubAgent(baseRequest({ subAgentId: 'instance-explorer' }), context);

		const callArg = runSyncSubAgentMock.mock.calls[0][1];
		expect(callArg.maxIterations).toBe(25);
	});
});
