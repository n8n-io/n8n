import type { LockService } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import {
	AgentThreadTurnCoordinator,
	type AgentThreadTurnPermit,
} from '../../agent-thread-turn-coordinator';
import type { AgentExecutionRepository } from '../../repositories/agent-execution.repository';

/**
 * A real coordinator over an in-memory lease. The lease signal of each held
 * turn is exposed so a test can simulate a lost distributed lock.
 */
export function createTestTurnCoordinator() {
	const lockService = mock<LockService>();
	const executionRepository = mock<AgentExecutionRepository>();
	const leases: AbortController[] = [];
	lockService.withLease.mockImplementation(async (_namespace, _key, fn) => {
		const lease = new AbortController();
		leases.push(lease);
		try {
			return await fn(lease.signal);
		} finally {
			lease.abort();
		}
	});
	executionRepository.existsRunningByThread.mockResolvedValue(false);
	const coordinator = new AgentThreadTurnCoordinator(lockService, executionRepository);

	/** Take the thread's turn and keep it for the rest of the test. */
	const permitFor = async (threadId: string): Promise<AgentThreadTurnPermit> =>
		(await coordinator.acquire(threadId)).permit;

	return { coordinator, lockService, executionRepository, leases, permitFor };
}
