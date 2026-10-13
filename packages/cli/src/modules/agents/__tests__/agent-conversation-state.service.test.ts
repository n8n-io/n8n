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
});
