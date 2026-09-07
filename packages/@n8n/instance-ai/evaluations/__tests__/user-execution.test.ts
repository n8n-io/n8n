import { mock } from 'vitest-mock-extended';

import type { N8nClient, WorkflowResponse } from '../clients/n8n-client';
import { runMultiTurnConversation } from '../harness/chat-loop';
import type { EvalLogger } from '../harness/logger';
import type { CapturedEvent } from '../types';

const client = mock<N8nClient>();
const logger = mock<EvalLogger>();
const workflow: WorkflowResponse = {
	id: 'primary',
	name: 'Primary',
	active: false,
	versionId: 'v1',
	connections: {},
	nodes: [{ id: 'trigger', name: 'Start', type: 'n8n-nodes-base.manualTrigger' }],
};

function saved(workflowId: string, success = true): CapturedEvent {
	return {
		timestamp: 0,
		type: 'tool-result',
		data: {
			payload: {
				toolCallId: workflowId,
				toolName: 'build-workflow',
				result: { workflowId, success },
			},
		},
	};
}

async function run(
	runWorkflowId = 'primary',
	events: CapturedEvent[] = [saved('primary'), saved('helper')],
	beforeUserExecution?: () => Promise<void>,
) {
	const decisions = [
		{ kind: 'followUp', message: 'I ran it', runWorkflowId } as const,
		{ kind: 'done' } as const,
	];
	await runMultiTurnConversation({
		client,
		logger,
		threadId: 'thread',
		buildMode: 'progressive',
		allowUserExecution: true,
		beforeUserExecution,
		events: [
			{ timestamp: 0, type: 'run-start', data: { type: 'run-start' } },
			{ timestamp: 0, type: 'run-finish', data: { type: 'run-finish' } },
			...events,
		],
		approvedRequests: new Set(),
		startTime: Date.now(),
		timeoutMs: 10_000,
		nextMessageDecider: async () => await Promise.resolve(decisions.shift() ?? { kind: 'done' }),
	});
}

describe('user execution during a conversation', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		client.getThreadStatus.mockResolvedValue({ backgroundTasks: [] } as never);
		client.getWorkflow.mockResolvedValue(workflow);
		client.executeWorkflow.mockResolvedValue({ executionId: 'execution' });
		client.getExecution.mockResolvedValue({
			id: 'execution',
			workflowId: 'primary',
			status: 'success',
			data: '',
		});
	});

	it('runs the selected primary workflow before the message, even after a helper was saved', async () => {
		await run();
		expect(client.executeWorkflow).toHaveBeenCalledWith('primary', 'Start', expect.any(Number));
		expect(client.executeWithLlmMock).not.toHaveBeenCalled();
		expect(client.getExecution.mock.invocationCallOrder[0]).toBeLessThan(
			client.sendMessage.mock.invocationCallOrder[0],
		);
		expect(client.sendMessage).toHaveBeenCalledWith('thread', 'I ran it', undefined, 'progressive');
	});

	it.each([{ events: [] }, { events: [saved('primary', false)] }])(
		'rejects a target without a successful save',
		async ({ events }) => {
			await expect(run('primary', events)).rejects.toThrow('was not saved');
			expect(client.executeWorkflow).not.toHaveBeenCalled();
			expect(client.sendMessage).not.toHaveBeenCalled();
		},
	);

	it('rejects pinned data instead of presenting it as a live run', async () => {
		client.getWorkflow.mockResolvedValue({ ...workflow, pinData: { Start: [{ json: {} }] } });
		await expect(run()).rejects.toThrow('without pinned data');
		expect(client.executeWorkflow).not.toHaveBeenCalled();
	});

	it('rejects credentialed workflows in the live eval action', async () => {
		client.getWorkflow.mockResolvedValue({
			...workflow,
			nodes: [
				...workflow.nodes,
				{
					id: 'slack',
					name: 'Slack',
					type: 'n8n-nodes-base.slack',
					credentials: { slackApi: { id: 'credential' } },
				},
			],
		});
		await expect(run()).rejects.toThrow('without credentials');
	});

	it('waits for a terminal execution and preserves failures for inspection', async () => {
		client.getExecution.mockResolvedValueOnce({
			id: 'execution',
			workflowId: 'primary',
			status: 'running',
			data: '',
		});
		client.getExecution.mockResolvedValueOnce({
			id: 'execution',
			workflowId: 'primary',
			status: 'error',
			data: '',
		});
		await run();
		expect(client.getExecution).toHaveBeenCalledTimes(2);
		expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('status=error'));
		expect(client.sendMessage).toHaveBeenCalledTimes(1);
	});

	it('bounds each execution request by the remaining case time', async () => {
		await run();
		const [, , timeoutMs] = client.executeWorkflow.mock.calls[0];
		expect(timeoutMs).toBeGreaterThan(0);
		expect(timeoutMs).toBeLessThan(10_000);
	});

	it('prepares the declared data before executing the workflow', async () => {
		const prepare = vi.fn().mockResolvedValue(undefined);
		await run('primary', [saved('primary')], prepare);
		expect(prepare).toHaveBeenCalledTimes(1);
		expect(prepare.mock.invocationCallOrder[0]).toBeLessThan(
			client.executeWorkflow.mock.invocationCallOrder[0],
		);
	});

	it('stops the execution if waiting fails', async () => {
		client.getExecution.mockRejectedValueOnce(new Error('Request timed out'));
		client.stopExecution.mockResolvedValueOnce(undefined);
		await expect(run()).rejects.toThrow('Request timed out');
		expect(client.stopExecution).toHaveBeenCalledWith('execution');
		expect(client.sendMessage).not.toHaveBeenCalled();
	});
});
