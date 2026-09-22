import type { SerializableAgentState } from '@n8n/agents';
import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentsConfig } from '@n8n/config';
import { mock } from 'vitest-mock-extended';

import {
	encodeAgentSandboxHostMetadata,
	hashAgentSandboxPrincipal,
} from '../../agent-sandbox-principal';
import type { AgentSessionLock } from '../../agent-session-lock.service';
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
	const sessionLock = mock<AgentSessionLock>();
	sessionLock.run.mockImplementation(async (_projectId, fn) => await fn({}));
	const service = new N8NCheckpointStorage(
		repository,
		mockLogger(),
		mock<AgentsConfig>({ checkpointTtlSeconds: 60 }),
		sessionLock,
	);

	return { service, repository, sessionLock };
}

describe('N8NCheckpointStorage', () => {
	it('creates new checkpoints with the storage agent as owner', async () => {
		const { service, repository } = makeService();

		await service.getStorage('agent-1').save('run-1', suspendedState);

		expect(repository.saveCheckpoint).toHaveBeenCalledWith({
			runId: 'run-1',
			agentId: 'agent-1',
			threadId: 'thread-1',
			state: JSON.stringify(suspendedState),
		});
	});

	it.each(['thread-1', undefined])('saves the current thread key as %s', async (threadId) => {
		const { service, repository } = makeService();
		const state = {
			...suspendedState,
			persistence: threadId ? { threadId, resourceId: 'resource-1' } : undefined,
		};

		await service.getStorage('agent-1').save('run-1', state);

		expect(repository.saveCheckpoint).toHaveBeenCalledWith({
			runId: 'run-1',
			agentId: 'agent-1',
			threadId: threadId ?? null,
			state: JSON.stringify(state),
		});
	});

	it('guards a session checkpoint with its admitted execution', async () => {
		const { service, repository, sessionLock } = makeService();
		const state = {
			...suspendedState,
			persistence: { ...suspendedState.persistence!, hostRunId: 'execution-1' },
		};

		await service.getStorage('agent-1', 'project-1').save('run-1', state);

		expect(sessionLock.run).toHaveBeenCalledWith('project-1', expect.any(Function));
		expect(repository.saveForRunningExecution).toHaveBeenCalledWith(
			{
				runId: 'run-1',
				agentId: 'agent-1',
				threadId: 'thread-1',
				state: JSON.stringify(state),
				projectId: 'project-1',
				executionId: 'execution-1',
			},
			{},
		);
	});

	it('preserves sessionless checkpoints for project-scoped runtimes', async () => {
		const { service, repository, sessionLock } = makeService();
		const state = { ...suspendedState, persistence: undefined };
		const storage = service.getStorage('agent-1', 'project-1');

		await storage.save('run-1', state);
		repository.findByRunIdAndAgentId.mockResolvedValue({
			runId: 'run-1',
			expired: false,
			state: JSON.stringify(state),
		} as AgentCheckpoint);

		await expect(storage.load('run-1')).resolves.toEqual(state);
		expect(repository.saveCheckpoint).toHaveBeenCalledWith({
			runId: 'run-1',
			agentId: 'agent-1',
			threadId: null,
			state: JSON.stringify(state),
		});
		expect(sessionLock.run).not.toHaveBeenCalled();
		expect(repository.sessionExists).not.toHaveBeenCalled();
	});

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

	describe('hasNoConflictingThreadResource', () => {
		const checkpoint = (overrides: Partial<AgentCheckpoint> = {}) =>
			mock<AgentCheckpoint>({
				agentId: 'agent-1',
				threadId: 'thread-1',
				state: JSON.stringify(suspendedState),
				...overrides,
			});

		it.each([
			{ name: 'allows an unused thread ID', rows: [], expected: true },
			{ name: 'allows a matching checkpoint', rows: [checkpoint()], expected: true },
			{
				name: 'rejects another agent',
				rows: [checkpoint({ agentId: 'agent-2' })],
				expected: false,
			},
			{
				name: 'rejects another resource',
				rows: [
					checkpoint({
						state: JSON.stringify({
							...suspendedState,
							persistence: { threadId: 'thread-1', resourceId: 'resource-2' },
						}),
					}),
				],
				expected: false,
			},
			{ name: 'ignores malformed state', rows: [checkpoint({ state: '{' })], expected: true },
			{ name: 'ignores cleared state', rows: [checkpoint({ state: null })], expected: true },
		])('$name', async ({ rows, expected }) => {
			const { service, repository } = makeService();
			repository.findRetainedByThreadId.mockResolvedValue(rows);

			await expect(
				service.hasNoConflictingThreadResource('agent-1', 'thread-1', 'resource-1'),
			).resolves.toBe(expected);
		});
	});

	describe('findSuspendedForThread', () => {
		const row = (runId: string, state: SerializableAgentState) =>
			({
				runId,
				agentId: 'agent-1',
				threadId: 'thread-target',
				expired: false,
				state: JSON.stringify(state),
			}) as AgentCheckpoint;

		const suspendedFor = (threadId: string, overrides: Record<string, unknown> = {}) =>
			({
				...suspendedState,
				persistence: { threadId, resourceId: 'resource-1', ...overrides },
			}) as SerializableAgentState;

		it('finds the newest parent suspension after newer ineligible checkpoints', async () => {
			const { service, repository } = makeService();
			const parent = { ...suspendedFor('thread-target'), iterationCount: 2 };
			repository.findActiveForThread.mockResolvedValue([
				row('child-run', suspendedFor('thread-target', { delegated: true })),
				row('running', { ...suspendedFor('thread-target'), status: 'running' }),
				row('wrong-state-thread', suspendedFor('thread-other')),
				row('run-target', parent),
				row('older-parent', suspendedFor('thread-target')),
			]);

			const result = await service.findSuspendedForThread('agent-1', 'thread-target');

			expect(result).toEqual(parent);
			expect(repository.findActiveForThread).toHaveBeenCalledWith('agent-1', 'thread-target');
		});

		// A delegated child suspends under its parent's thread; the parent run
		// owns the conversation, so the child must not surface as its suspension.
		it('ignores delegated child checkpoints', async () => {
			const { service, repository } = makeService();
			repository.findActiveForThread.mockResolvedValue([
				row('child-run', suspendedFor('thread-target', { delegated: true })),
			]);

			await expect(service.findSuspendedForThread('agent-1', 'thread-target')).resolves.toBeNull();
		});

		it('ignores checkpoints that are no longer suspended, and malformed state', async () => {
			const { service, repository } = makeService();
			repository.findActiveForThread.mockResolvedValue([
				row('run-running', { ...suspendedFor('thread-target'), status: 'running' }),
				row('run-cancelled', { ...suspendedFor('thread-target'), status: 'cancelled' }),
				...['{', 'null', '', null].map((state, index) => ({
					...row(`invalid-${index}`, suspendedFor('thread-target')),
					state,
				})),
			]);

			await expect(service.findSuspendedForThread('agent-1', 'thread-target')).resolves.toBeNull();
		});
	});
});
