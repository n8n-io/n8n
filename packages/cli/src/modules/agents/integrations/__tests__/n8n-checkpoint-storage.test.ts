import type { SerializableAgentState } from '@n8n/agents';
import type { ModuleRegistry } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import type { InstanceSettings } from 'n8n-core';
import { mock } from 'vitest-mock-extended';

import {
	encodeAgentSandboxHostMetadata,
	hashAgentSandboxPrincipal,
} from '../../agent-sandbox-principal';
import type { AgentCheckpoint } from '../../entities/agent-checkpoint.entity';
import type { AgentCheckpointRepository } from '../../repositories/agent-checkpoint.repository';
import {
	CHECKPOINT_RECONCILIATION_OVERFLOW,
	N8NCheckpointStorage,
} from '../n8n-checkpoint-storage';

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
const principalHash = hashAgentSandboxPrincipal({ type: 'n8n-user', userId: 'user-1' });

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

	it('returns every persisted active run for the principal workspace', async () => {
		const { service, repository } = makeService();
		const otherPrincipalHash = hashAgentSandboxPrincipal({
			type: 'n8n-user',
			userId: 'user-2',
		});
		const stateFor = (
			status: SerializableAgentState['status'],
			hash = principalHash,
		): SerializableAgentState => ({
			...suspendedState,
			status,
			persistence: {
				...suspendedState.persistence!,
				hostMetadata: encodeAgentSandboxHostMetadata({
					projectId: 'project-1',
					principalHash: hash,
				}),
			},
		});
		const checkpoint = (
			runId: string,
			state: string | null,
			overrides: Partial<AgentCheckpoint> = {},
		) =>
			({
				runId,
				agentId: 'agent-1',
				expired: false,
				state,
				updatedAt: new Date(),
				...overrides,
			}) as AgentCheckpoint;
		repository.findForSandboxReconciliation.mockResolvedValue([
			checkpoint('run-running', JSON.stringify(stateFor('running'))),
			checkpoint('run-suspended', JSON.stringify(stateFor('suspended'))),
			checkpoint('run-cancelled', JSON.stringify(stateFor('cancelled'))),
			checkpoint('run-other-principal', JSON.stringify(stateFor('running', otherPrincipalHash))),
			checkpoint('run-old', JSON.stringify(stateFor('suspended')), { updatedAt: new Date(0) }),
			checkpoint('run-expired', JSON.stringify(stateFor('running')), { expired: true }),
			checkpoint('run-malformed', '{'),
			checkpoint('run-empty', null),
		]);

		await expect(service.getActiveRunIdsForSandbox('agent-1', principalHash)).resolves.toEqual(
			new Set(['run-running', 'run-suspended', 'run-old']),
		);
	});

	it('reports overflow instead of returning a partial set of protected runs', async () => {
		const { service, repository } = makeService();
		repository.findForSandboxReconciliation.mockResolvedValue(
			Array.from({ length: 101 }, (_, index) => ({ runId: `run-${index}` }) as AgentCheckpoint),
		);

		await expect(service.getActiveRunIdsForSandbox('agent-1', principalHash)).resolves.toBe(
			CHECKPOINT_RECONCILIATION_OVERFLOW,
		);
	});

	describe('findSuspendedForThread', () => {
		const row = (runId: string, state: SerializableAgentState) =>
			({
				runId,
				agentId: 'agent-1',
				expired: false,
				state: JSON.stringify(state),
			}) as AgentCheckpoint;

		const suspendedFor = (threadId: string, overrides: Record<string, unknown> = {}) =>
			({
				...suspendedState,
				persistence: { threadId, resourceId: 'resource-1', ...overrides },
			}) as SerializableAgentState;

		// Every active checkpoint is scanned, not just the newest few — a busy
		// agent's other threads must not hide this thread's suspension.
		it('returns the checkpoint parked on the requested thread', async () => {
			const { service, repository } = makeService();
			repository.findActiveForAgent.mockResolvedValue([
				row('run-1', suspendedFor('thread-other-1')),
				row('run-2', suspendedFor('thread-other-2')),
				row('run-3', suspendedFor('thread-other-3')),
				row('run-4', suspendedFor('thread-other-4')),
				row('run-5', suspendedFor('thread-other-5')),
				row('run-target', suspendedFor('thread-target')),
			]);

			const result = await service.findSuspendedForThread('agent-1', 'thread-target');

			expect(result?.persistence?.threadId).toBe('thread-target');
		});

		// A delegated child suspends under its parent's thread; the parent run
		// owns the conversation, so the child must not surface as its suspension.
		it('ignores delegated child checkpoints', async () => {
			const { service, repository } = makeService();
			repository.findActiveForAgent.mockResolvedValue([
				row('child-run', suspendedFor('thread-target', { delegated: true })),
			]);

			await expect(service.findSuspendedForThread('agent-1', 'thread-target')).resolves.toBeNull();
		});

		it('ignores checkpoints that are no longer suspended, and malformed state', async () => {
			const { service, repository } = makeService();
			repository.findActiveForAgent.mockResolvedValue([
				row('run-running', { ...suspendedFor('thread-target'), status: 'running' }),
				{
					runId: 'run-malformed',
					agentId: 'agent-1',
					expired: false,
					state: '{',
				} as AgentCheckpoint,
			]);

			await expect(service.findSuspendedForThread('agent-1', 'thread-target')).resolves.toBeNull();
		});
	});
});
