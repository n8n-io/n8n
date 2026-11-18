import type { PolicedToolCallRecord } from '@n8n/decorators';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionService } from '../agent-execution.service';
import { AgentToolCallHistoryService } from '../agent-tool-call-history.service';
import type { AgentExecution } from '../entities/agent-execution.entity';
import type { TimelineEvent } from '../execution-recorder';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';

describe('AgentToolCallHistoryService', () => {
	const toolCall = (
		toolCallId: string,
		name: string,
		overrides: Partial<Extract<TimelineEvent, { type: 'tool-call' }>> = {},
	): TimelineEvent => ({
		type: 'tool-call',
		kind: 'tool',
		name,
		toolCallId,
		input: { for: toolCallId },
		output: { from: toolCallId },
		startTime: 1,
		endTime: 2,
		success: true,
		...overrides,
	});

	// A plain object: a deep mock would answer every absent field of an event with a function.
	const execution = (timeline: TimelineEvent[] | null) => ({ timeline }) as AgentExecution;

	const pending: PolicedToolCallRecord = {
		toolCallId: 'call-3',
		toolName: 'send_message',
		input: { text: 'hi' },
		status: 'pending',
	};

	function setUp() {
		const threadRepository = mock<AgentExecutionThreadRepository>();
		const executionService = mock<AgentExecutionService>();
		executionService.findThreadExecutions.mockResolvedValue([]);
		return {
			threadRepository,
			executionService,
			service: new AgentToolCallHistoryService(threadRepository, executionService),
		};
	}

	it('returns the calls of the run alone for a run that keeps no session', async () => {
		const { service, threadRepository } = setUp();

		expect(await service.sessionHistory(null, 'agent-1', [pending])).toEqual([
			{ threadId: null, agentId: 'agent-1', toolCalls: [pending] },
		]);
		expect(threadRepository.findDelegationChain).not.toHaveBeenCalled();
	});

	it('puts the stored turns of the session before the calls of the run', async () => {
		const { service, threadRepository, executionService } = setUp();
		threadRepository.findDelegationChain.mockResolvedValue([
			{ id: 'thread-1', agentId: 'agent-1' },
		]);
		executionService.findThreadExecutions.mockResolvedValue([
			execution([
				{ type: 'text', content: 'Looking it up', timestamp: 1 },
				toolCall('call-1', 'lookup'),
			]),
			execution([toolCall('call-2', 'delete_record', { success: false, output: 'Not found' })]),
		]);

		const [session] = await service.sessionHistory('thread-1', 'agent-1', [pending]);

		expect(executionService.findThreadExecutions).toHaveBeenCalledExactlyOnceWith(
			'thread-1',
			'agent-1',
		);
		expect(session).toEqual({
			threadId: 'thread-1',
			agentId: 'agent-1',
			toolCalls: [
				{
					toolCallId: 'call-1',
					toolName: 'lookup',
					input: { for: 'call-1' },
					status: 'success',
					output: { from: 'call-1' },
				},
				{
					toolCallId: 'call-2',
					toolName: 'delete_record',
					input: { for: 'call-2' },
					status: 'error',
					output: 'Not found',
				},
				pending,
			],
		});
	});

	it('takes a call from the run when the stored timeline has it too', async () => {
		const { service, threadRepository, executionService } = setUp();
		threadRepository.findDelegationChain.mockResolvedValue([
			{ id: 'thread-1', agentId: 'agent-1' },
		]);
		executionService.findThreadExecutions.mockResolvedValue([
			execution([toolCall('call-1', 'lookup'), toolCall('call-2', 'lookup')]),
		]);
		const fromRun: PolicedToolCallRecord = {
			toolCallId: 'call-2',
			toolName: 'lookup',
			input: { raw: true },
			status: 'success',
			output: { fresh: true },
		};

		const [session] = await service.sessionHistory('thread-1', 'agent-1', [fromRun, pending]);

		expect(session.toolCalls.map((call) => call.toolCallId)).toEqual([
			'call-1',
			'call-2',
			'call-3',
		]);
		expect(session.toolCalls[1]).toBe(fromRun);
	});

	it('marks a stored call that was cancelled', async () => {
		const { service, threadRepository, executionService } = setUp();
		threadRepository.findDelegationChain.mockResolvedValue([
			{ id: 'thread-1', agentId: 'agent-1' },
		]);
		executionService.findThreadExecutions.mockResolvedValue([
			execution([toolCall('call-1', 'send_message', { canceled: true })]),
		]);

		const [session] = await service.sessionHistory('thread-1', 'agent-1', []);

		expect(session.toolCalls).toMatchObject([{ toolCallId: 'call-1', status: 'canceled' }]);
	});

	it('adds each session that delegated to this one, up to the root', async () => {
		const { service, threadRepository, executionService } = setUp();
		threadRepository.findDelegationChain.mockResolvedValue([
			{ id: 'child', agentId: 'agent-child' },
			{ id: 'parent', agentId: 'agent-parent' },
		]);
		executionService.findThreadExecutions.mockImplementation(async (threadId) =>
			threadId === 'parent' ? [execution([toolCall('parent-call', 'read_inbox')])] : [],
		);

		const history = await service.sessionHistory('child', 'agent-child', [pending]);

		expect(history).toMatchObject([
			{ threadId: 'child', agentId: 'agent-child', toolCalls: [pending] },
			{
				threadId: 'parent',
				agentId: 'agent-parent',
				toolCalls: [{ toolCallId: 'parent-call', toolName: 'read_inbox' }],
			},
		]);
	});

	it('has no stored calls for a session without a stored thread or timeline', async () => {
		const { service, threadRepository, executionService } = setUp();
		threadRepository.findDelegationChain.mockResolvedValue([
			{ id: 'thread-1', agentId: 'agent-1' },
			{ id: 'inline-parent', agentId: null },
		]);
		executionService.findThreadExecutions.mockResolvedValue([execution(null)]);

		const history = await service.sessionHistory('thread-1', 'agent-1', []);

		expect(history).toEqual([
			{ threadId: 'thread-1', agentId: 'agent-1', toolCalls: [] },
			{ threadId: 'inline-parent', agentId: null, toolCalls: [] },
		]);
		expect(executionService.findThreadExecutions).toHaveBeenCalledExactlyOnceWith(
			'thread-1',
			'agent-1',
		);
	});
});
