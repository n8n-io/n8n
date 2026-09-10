import { LockService } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import {
	AgentForegroundTurnService,
	AgentSessionBusyError,
} from '../agent-foreground-turn.service';
import type { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import type { AgentExecutionRepository } from '../repositories/agent-execution.repository';

function setup() {
	const locks = Container.get(LockService);
	const executions = mock<AgentExecutionRepository>();
	const checkpoints = mock<N8NCheckpointStorage>();
	executions.existsRunningByThread.mockResolvedValue(false);
	checkpoints.findSuspendedForThread.mockResolvedValue(null);
	return {
		service: new AgentForegroundTurnService(locks, executions, checkpoints),
		otherMain: new AgentForegroundTurnService(locks, executions, checkpoints),
		executions,
		checkpoints,
	};
}

describe('AgentForegroundTurnService', () => {
	it.each(['wake', 'chat', 'resume'] as const)(
		'rejects a chat while a %s owns the session',
		async (kind) => {
			const { service, otherMain, checkpoints } = setup();
			checkpoints.getStatus.mockResolvedValue({
				status: 'active',
				checkpoint: { persistence: { threadId: 'thread-1' } },
			} as never);
			const started = createDeferredPromise();
			const finish = createDeferredPromise();
			const action = async () => {
				started.resolve();
				await finish.promise;
			};
			const first =
				kind === 'wake'
					? service.run('thread-1', action)
					: kind === 'chat'
						? service.runForChat('agent-1', 'thread-1', action)
						: service.runForResume('agent-1', 'run-1', action);
			await started.promise;
			const secondAction = vi.fn();
			try {
				await expect(
					otherMain.runForChat('agent-1', 'thread-1', secondAction),
				).rejects.toBeInstanceOf(AgentSessionBusyError);
				expect(secondAction).not.toHaveBeenCalled();
				await expect(otherMain.run('thread-2', async () => 'other session')).resolves.toBe(
					'other session',
				);
			} finally {
				finish.resolve();
				await first;
			}
			await expect(otherMain.runForChat('agent-1', 'thread-1', async () => 'next')).resolves.toBe(
				'next',
			);
		},
	);

	it('rejects a wake while a chat owns the session', async () => {
		const { service, otherMain } = setup();
		const started = createDeferredPromise();
		const finish = createDeferredPromise();
		const chat = service.runForChat('agent-1', 'thread-1', async () => {
			started.resolve();
			await finish.promise;
		});
		await started.promise;
		try {
			await expect(otherMain.run('thread-1', vi.fn())).rejects.toBeInstanceOf(
				AgentSessionBusyError,
			);
		} finally {
			finish.resolve();
			await chat;
		}
	});

	it('waits for the current turn before an automatic continuation starts', async () => {
		const { service, otherMain, checkpoints } = setup();
		checkpoints.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1' } },
		} as never);
		const started = createDeferredPromise();
		const finish = createDeferredPromise();
		const first = service.run('thread-1', async () => {
			started.resolve();
			await finish.promise;
		});
		await started.promise;
		const continuation = vi.fn().mockResolvedValue('continued');
		const next = otherMain.runForResume('agent-1', 'run-1', continuation, { waitForLease: true });
		await Promise.resolve();
		expect(continuation).not.toHaveBeenCalled();
		finish.resolve();
		await first;
		await expect(next).resolves.toBe('continued');
	});

	it('keeps the database guard and releases the lease after a failure', async () => {
		const { service, executions } = setup();
		const action = vi.fn().mockResolvedValue('next');
		executions.existsRunningByThread.mockResolvedValueOnce(true);
		await expect(service.run('thread-1', action)).rejects.toBeInstanceOf(AgentSessionBusyError);
		expect(action).not.toHaveBeenCalled();
		await expect(
			service.run('thread-1', async () => {
				throw new Error('failed');
			}),
		).rejects.toThrow('failed');
		await expect(service.run('thread-1', action)).resolves.toBe('next');
	});

	it('keeps a suspended session available only for resume', async () => {
		const { service, checkpoints } = setup();
		checkpoints.findSuspendedForThread.mockResolvedValue({ runId: 'run-1' } as never);
		await expect(service.runForChat('agent-1', 'thread-1', vi.fn())).rejects.toBeInstanceOf(
			AgentSessionBusyError,
		);
		checkpoints.getStatus.mockResolvedValue({
			status: 'active',
			checkpoint: { persistence: { threadId: 'thread-1' } },
		} as never);
		await expect(service.runForResume('agent-1', 'run-1', async () => 'resumed')).resolves.toBe(
			'resumed',
		);
	});
});
