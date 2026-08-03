import type { SerializableAgentState } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { NodeCatalogService } from '@/node-catalog';

import type { InstanceAiCreditService } from '../../instance-ai/instance-ai-credit.service';
import type { AgentsService } from '../agents.service';
import type { AgentsBuilderToolsService } from '../builder/agents-builder-tools.service';
import { AgentsBuilderService } from '../builder/agents-builder.service';
import type { AgentCheckpoint } from '../entities/agent-checkpoint.entity';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { AgentCheckpointRepository } from '../repositories/agent-checkpoint.repository';

function suspendedCheckpoint(threadId: string): SerializableAgentState {
	return {
		status: 'suspended',
		persistence: { threadId, resourceId: 'user-1' },
		pendingToolCalls: {},
		messageList: { messages: [] },
	} as unknown as SerializableAgentState;
}

function checkpointRow(runId: string, threadId: string): AgentCheckpoint {
	return {
		runId,
		agentId: 'agent-1',
		expired: false,
		state: JSON.stringify(suspendedCheckpoint(threadId)),
	} as AgentCheckpoint;
}

function makeService(agentCheckpointRepository: Mocked<AgentCheckpointRepository>) {
	return new AgentsBuilderService(
		mock<Logger>(),
		mock<AgentsService>(),
		mock<NodeCatalogService>(),
		mock<AgentsBuilderToolsService>(),
		mock<N8nMemory>(),
		mock<InstanceAiCreditService>(),
		mock<N8NCheckpointStorage>(),
		agentCheckpointRepository,
	);
}

describe('AgentsBuilderService checkpoint lookup', () => {
	it('does not cap thread-scoped checkpoint lookup to the five newest agent checkpoints', async () => {
		const agentCheckpointRepository = mock<AgentCheckpointRepository>();
		const rows = [
			checkpointRow('run-1', 'thread-newer-1'),
			checkpointRow('run-2', 'thread-newer-2'),
			checkpointRow('run-3', 'thread-newer-3'),
			checkpointRow('run-4', 'thread-newer-4'),
			checkpointRow('run-5', 'thread-newer-5'),
			checkpointRow('run-target', 'thread-target'),
		];
		agentCheckpointRepository.findActiveForAgent.mockResolvedValue(rows);

		const service = makeService(agentCheckpointRepository);

		const result = await service.findOpenCheckpointForThread('agent-1', 'thread-target');

		expect(result?.persistence?.threadId).toBe('thread-target');
	});

	it('does not expose delegated child checkpoints through chat history lookup', async () => {
		const agentCheckpointRepository = mock<AgentCheckpointRepository>();
		const delegatedState = suspendedCheckpoint('thread-target');
		delegatedState.persistence = {
			threadId: 'thread-target',
			resourceId: 'user-1',
			delegated: true,
		};
		agentCheckpointRepository.findActiveForAgent.mockResolvedValue([
			{
				...checkpointRow('child-run-1', 'thread-target'),
				state: JSON.stringify(delegatedState),
			},
		]);

		const service = makeService(agentCheckpointRepository);

		await expect(
			service.findOpenCheckpointForThread('agent-1', 'thread-target'),
		).resolves.toBeNull();
	});
});
