import type { SerializableAgentState } from '@n8n/agents';
import type { ModuleRegistry } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import type { AgentCheckpoint } from '../../entities/agent-checkpoint.entity';
import type { AgentCheckpointRepository } from '../../repositories/agent-checkpoint.repository';
import { N8NCheckpointStorage } from '../n8n-checkpoint-storage';

const suspendedState: SerializableAgentState = {
	status: 'suspended',
	persistence: { threadId: 'thread-1', resourceId: 'resource-1' },
	messageList: { messages: [], historyIds: [], inputIds: [], responseIds: [] },
	pendingToolCalls: {
		'tc-1': {
			toolCallId: 'tc-1',
			toolName: 'approve_action',
			input: { id: 'item-1' },
			suspended: false,
		},
	},
};

function makeService() {
	const repository = mock<AgentCheckpointRepository>();
	const service = new N8NCheckpointStorage(
		mock<InstanceSettings>({ isLeader: false, instanceRole: 'follower' }),
		repository,
		mockLogger(),
		mock<AgentsConfig>({ checkpointTtlSeconds: 60 }),
		mock<ModuleRegistry>({ isActive: vi.fn().mockReturnValue(true) }),
	);

	return { service, repository };
}

describe('N8NCheckpointStorage', () => {
	it('creates new checkpoints with the storage agent as owner', async () => {
		const { service, repository } = makeService();
		const checkpoint = {
			runId: 'run-1',
			agentId: 'agent-1',
			expired: false,
			state: JSON.stringify(suspendedState),
		} as AgentCheckpoint;
		repository.findByRunId.mockResolvedValue(null);
		repository.create.mockReturnValue(checkpoint);

		await service.getStorage('agent-1').save('run-1', suspendedState);

		expect(repository.create).toHaveBeenCalledWith({
			runId: 'run-1',
			agentId: 'agent-1',
			expired: false,
			state: JSON.stringify(suspendedState),
		});
		expect(repository.save).toHaveBeenCalledWith(checkpoint);
	});

	it('updates a checkpoint only when the owner matches', async () => {
		const { service, repository } = makeService();
		const checkpoint = {
			runId: 'run-1',
			agentId: 'agent-1',
			expired: true,
			state: null,
		} as AgentCheckpoint;
		repository.findByRunId.mockResolvedValue(checkpoint);

		await service.getStorage('agent-1').save('run-1', suspendedState);

		expect(checkpoint).toMatchObject({
			agentId: 'agent-1',
			expired: false,
			state: JSON.stringify(suspendedState),
		});
		expect(repository.save).toHaveBeenCalledWith(checkpoint);
	});

	it.each(['agent-2', null])(
		'rejects overwriting a checkpoint owned by %s',
		async (existingAgentId) => {
			const { service, repository } = makeService();
			repository.findByRunId.mockResolvedValue({
				runId: 'run-1',
				agentId: existingAgentId,
				expired: false,
				state: JSON.stringify(suspendedState),
			} as AgentCheckpoint);

			await expect(service.getStorage('agent-1').save('run-1', suspendedState)).rejects.toThrow(
				'owned by a different agent',
			);
			expect(repository.save).not.toHaveBeenCalled();
		},
	);

	it('loads only a checkpoint owned by the storage agent', async () => {
		const { service, repository } = makeService();
		const storedState = JSON.stringify(suspendedState);
		repository.findByRunIdAndAgentId.mockResolvedValue({
			runId: 'run-1',
			expired: false,
			state: storedState,
		} as AgentCheckpoint);

		await expect(service.getStorage('agent-1').load('run-1')).resolves.toEqual(suspendedState);

		expect(repository.findByRunIdAndAgentId).toHaveBeenCalledWith('run-1', 'agent-1');
		expect(repository.claimForResume).not.toHaveBeenCalled();
	});

	it('claims only a checkpoint owned by the storage agent', async () => {
		const { service, repository } = makeService();
		repository.claimForResume.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
		const storage = service.getStorage('agent-1');

		await expect(storage.claimForResume?.('run-1', suspendedState)).resolves.toBe(true);
		expect(repository.claimForResume).toHaveBeenCalledWith(
			'run-1',
			'agent-1',
			JSON.stringify(suspendedState),
			JSON.stringify({ ...suspendedState, status: 'running' }),
		);
		await expect(storage.claimForResume?.('run-1', suspendedState)).resolves.toBe(false);
	});

	it('atomically expires a suspended checkpoint for an agent', async () => {
		const { service, repository } = makeService();
		repository.cancelSuspended.mockResolvedValue(true);

		await expect(service.cancelSuspended('run-1', suspendedState, 'agent-1')).resolves.toBe(true);

		expect(repository.cancelSuspended).toHaveBeenCalledWith(
			'run-1',
			'agent-1',
			JSON.stringify(suspendedState),
		);
	});

	it('returns status only for a checkpoint owned by the agent', async () => {
		const { service, repository } = makeService();
		repository.findByRunIdAndAgentId.mockResolvedValue({
			runId: 'run-1',
			expired: false,
			state: JSON.stringify(suspendedState),
		} as AgentCheckpoint);

		await expect(service.getStatus('run-1', 'agent-1')).resolves.toEqual({
			status: 'active',
			checkpoint: suspendedState,
		});

		expect(repository.findByRunIdAndAgentId).toHaveBeenCalledWith('run-1', 'agent-1');
	});

	it('retains an expired checkpoint state while cancellation cleanup is pending', async () => {
		const { service, repository } = makeService();
		repository.findByRunIdAndAgentId.mockResolvedValue({
			runId: 'run-1',
			expired: true,
			state: JSON.stringify(suspendedState),
		} as AgentCheckpoint);

		await expect(service.getStatus('run-1', 'agent-1')).resolves.toEqual({
			status: 'expired',
			checkpoint: suspendedState,
		});
	});

	it('expires only a checkpoint owned by the storage agent', async () => {
		const { service, repository } = makeService();

		await service.getStorage('agent-1').delete('run-1');

		expect(repository.expireByRunIdAndAgentId).toHaveBeenCalledWith('run-1', 'agent-1');
	});
});
