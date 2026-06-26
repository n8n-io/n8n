import type { Mocked } from 'vitest';
import type { SerializableAgentState } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import type { AgentsConfig } from '@n8n/config';
import type { AgentCheckpoint } from '../entities/agent-checkpoint.entity';
import { mock } from 'vitest-mock-extended';

import type { AgentsService } from '../agents.service';
import type { AgentCheckpointRepository } from '../repositories/agent-checkpoint.repository';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { N8nMemory } from '../integrations/n8n-memory';
import type { NodeCatalogService } from '@/node-catalog';

import { AgentsBuilderService } from '../builder/agents-builder.service';
import type { AgentsBuilderToolsService } from '../builder/agents-builder-tools.service';
import type { AgentsBuilderSettingsService } from '../builder/agents-builder-settings.service';

function suspendedCheckpoint(threadId: string): SerializableAgentState {
	return {
		status: 'suspended',
		persistence: { threadId, resourceId: 'user-1' },
		pendingToolCalls: {},
		messageList: { messages: [] },
	} as unknown as SerializableAgentState;
}

function checkpointRow(
	runId: string,
	threadId: string,
	agentId: string | null = 'agent-1',
): AgentCheckpoint {
	return {
		runId,
		agentId,
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
		mock<AgentsBuilderSettingsService>(),
		mock<N8NCheckpointStorage>(),
		agentCheckpointRepository,
		mock<AgentsConfig>(),
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
		agentCheckpointRepository.find.mockImplementation(async (options) => {
			const take = typeof options?.take === 'number' ? options.take : rows.length;
			return rows.slice(0, take);
		});

		const service = makeService(agentCheckpointRepository);

		const result = await service.findOpenCheckpointForThread('agent-1', 'thread-target');

		expect(result?.persistence?.threadId).toBe('thread-target');
	});

	it('can find legacy unscoped checkpoints only when explicitly requested', async () => {
		const agentCheckpointRepository = mock<AgentCheckpointRepository>();
		const legacyRow = checkpointRow('run-legacy', 'thread-target', null);
		agentCheckpointRepository.find.mockImplementation(async (options) => {
			const where = options?.where;
			const includesUnscoped = Array.isArray(where);
			return includesUnscoped ? [legacyRow] : [];
		});

		const service = makeService(agentCheckpointRepository);

		await expect(
			service.findOpenCheckpointForThread('agent-1', 'thread-target'),
		).resolves.toBeNull();
		const result = await service.findOpenCheckpointForThread('agent-1', 'thread-target', {
			includeUnscoped: true,
		});

		expect(result?.persistence?.threadId).toBe('thread-target');
	});
});
