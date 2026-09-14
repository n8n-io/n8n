import { mock } from 'vitest-mock-extended';

import {
	AgentThreadTurnCoordinator,
	type AgentThreadTurnPermit,
} from '../../agent-thread-turn-coordinator';
import type { AgentExecutionRepository } from '../../repositories/agent-execution.repository';

/** A real coordinator over a mocked execution repository with no running rows. */
export function createTestTurnCoordinator() {
	const executionRepository = mock<AgentExecutionRepository>();
	executionRepository.existsRunningByThread.mockResolvedValue(false);
	const coordinator = new AgentThreadTurnCoordinator(executionRepository);

	/** Take the thread's turn and keep it for the rest of the test. */
	const permitFor = async (threadId: string): Promise<AgentThreadTurnPermit> =>
		(await coordinator.acquire(threadId)).permit;

	return { coordinator, executionRepository, permitFor };
}
