import type { SerializableAgentState } from '@n8n/agents';
import { mock } from 'vitest-mock-extended';

import { AgentConversationStateService } from '../agent-conversation-state.service';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';

const AGENT_ID = 'agent-1';
const RUN_ID = 'run-1';

function checkpoint(status: SerializableAgentState['status']): SerializableAgentState {
	return mock<SerializableAgentState>({ status });
}

describe('AgentConversationStateService', () => {
	describe('isResumable', () => {
		const executionRepository = mock<AgentExecutionRepository>();

		function createService(status: Awaited<ReturnType<N8NCheckpointStorage['getStatus']>>) {
			const checkpointStorage = mock<N8NCheckpointStorage>({
				getStatus: vi.fn(async () => status),
			});
			const service = new AgentConversationStateService(executionRepository, checkpointStorage);
			return { service, checkpointStorage };
		}

		it('accepts a checkpoint that is still suspended', async () => {
			const { service, checkpointStorage } = createService({
				status: 'active',
				checkpoint: checkpoint('suspended'),
			});

			await expect(service.isResumable(AGENT_ID, RUN_ID)).resolves.toBe(true);
			expect(checkpointStorage.getStatus).toHaveBeenCalledWith(RUN_ID, AGENT_ID);
		});

		it.each(['running', 'success', 'failed', 'waiting', 'idle'] as const)(
			'rejects a checkpoint the runtime already took (%s)',
			async (status) => {
				const { service } = createService({ status: 'active', checkpoint: checkpoint(status) });

				await expect(service.isResumable(AGENT_ID, RUN_ID)).resolves.toBe(false);
			},
		);

		it('rejects an expired checkpoint', async () => {
			const { service } = createService({
				status: 'expired',
				checkpoint: checkpoint('suspended'),
			});

			await expect(service.isResumable(AGENT_ID, RUN_ID)).resolves.toBe(false);
		});

		it('rejects a checkpoint that is gone', async () => {
			const { service } = createService({ status: 'not-found' });

			await expect(service.isResumable(AGENT_ID, RUN_ID)).resolves.toBe(false);
		});
	});

	describe('inspect', () => {
		const THREAD_ID = 'thread-1';

		function createService() {
			const executionRepository = mock<AgentExecutionRepository>();
			const checkpointStorage = mock<N8NCheckpointStorage>();
			executionRepository.existsRunningByThread.mockResolvedValue(true);
			checkpointStorage.findSuspendedForThread.mockResolvedValue(checkpoint('suspended'));
			const service = new AgentConversationStateService(executionRepository, checkpointStorage);
			return { service, executionRepository, checkpointStorage };
		}

		it('reports the running execution and the suspended checkpoint', async () => {
			const { service } = createService();

			await expect(service.inspect(AGENT_ID, THREAD_ID)).resolves.toEqual({
				running: true,
				suspendedCheckpoint: expect.objectContaining({ status: 'suspended' }),
			});
		});

		it('reads both records in the transaction of the caller', async () => {
			const { service, executionRepository, checkpointStorage } = createService();
			const ctx = {};

			await service.inspect(AGENT_ID, THREAD_ID, ctx);

			expect(executionRepository.existsRunningByThread).toHaveBeenCalledWith(THREAD_ID, ctx);
			expect(checkpointStorage.findSuspendedForThread).toHaveBeenCalledWith(
				AGENT_ID,
				THREAD_ID,
				ctx,
			);
		});
	});

	describe('getSuspendedRun', () => {
		function createService(status: Awaited<ReturnType<N8NCheckpointStorage['getStatus']>>) {
			const checkpointStorage = mock<N8NCheckpointStorage>({
				getStatus: vi.fn(async () => status),
			});
			return new AgentConversationStateService(mock<AgentExecutionRepository>(), checkpointStorage);
		}

		const toolCall = (toolCallId: string, output: unknown) => ({
			type: 'tool-call',
			toolCallId,
			toolName: 'slack_action',
			input: {},
			state: 'resolved',
			output,
		});

		it('returns the resolved tool calls of this run and its agent thread', async () => {
			const service = createService({
				status: 'active',
				checkpoint: {
					status: 'suspended',
					persistence: { threadId: 'agent-thread-1', resourceId: 'resource-1' },
					pendingToolCalls: {},
					messageList: {
						messages: [
							// From an earlier turn: its files went out with that turn.
							{ id: 'm-0', role: 'assistant', content: [toolCall('tc-0', { old: true })] },
							{
								id: 'm-1',
								role: 'assistant',
								content: [
									{ type: 'text', text: 'Making it' },
									toolCall('tc-1', { ok: true, queuedFileIds: ['file-1'] }),
									{
										type: 'tool-call',
										toolCallId: 'tc-2',
										toolName: 'slack_action',
										input: {},
										state: 'pending',
									},
								],
							},
						],
						historyIds: ['m-0'],
						inputIds: [],
						responseIds: ['m-1'],
					},
				} as unknown as SerializableAgentState,
			});

			await expect(service.getSuspendedRun(AGENT_ID, RUN_ID)).resolves.toEqual({
				threadId: 'agent-thread-1',
				toolResults: [
					{
						toolCallId: 'tc-1',
						toolName: 'slack_action',
						output: { ok: true, queuedFileIds: ['file-1'] },
					},
				],
			});
		});

		it('returns null for a checkpoint that is not suspended', async () => {
			const service = createService({
				status: 'active',
				checkpoint: {
					status: 'running',
					persistence: { threadId: 'agent-thread-1', resourceId: 'resource-1' },
					pendingToolCalls: {},
					messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
				},
			});

			await expect(service.getSuspendedRun(AGENT_ID, RUN_ID)).resolves.toBeNull();
		});

		it('returns null for a checkpoint that is gone', async () => {
			const service = createService({ status: 'not-found' });

			await expect(service.getSuspendedRun(AGENT_ID, RUN_ID)).resolves.toBeNull();
		});
	});
});
