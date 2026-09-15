import type { Logger } from '@n8n/backend-common';
import type { User, UserRepository } from '@n8n/db';
import { Container } from '@n8n/di';
import { mock } from 'vitest-mock-extended';

import type { AgentExecutionOrchestratorService } from '../../agent-execution-orchestrator.service';
import type {
	AgentExecutionService,
	StartExecutionParams,
	TurnRowValues,
} from '../../agent-execution.service';
import { AgentTurnQueueService, type AgentTurnClaim } from '../../agent-turn-queue.service';
import { AgentWakeService } from '../../background/agent-wake.service';
import type { AgentExecutionThread } from '../../entities/agent-execution-thread.entity';
import type { AgentExecution } from '../../entities/agent-execution.entity';
import { ChatIntegrationService } from '../../integrations/chat-integration.service';
import type { N8NCheckpointStorage } from '../../integrations/n8n-checkpoint-storage';
import type { AgentExecutionThreadRepository } from '../../repositories/agent-execution-thread.repository';
import {
	AgentThreadClaimConflictError,
	type AgentExecutionRepository,
} from '../../repositories/agent-execution.repository';
import type { AgentRepository } from '../../repositories/agent.repository';

export type TestTurnRow = Pick<
	AgentExecution,
	| 'id'
	| 'threadId'
	| 'status'
	| 'runContext'
	| 'resourceId'
	| 'userMessage'
	| 'attachments'
	| 'source'
> & { agentId: string; projectId: string; error?: string };

/**
 * The real queue service over an in-memory `agent_execution` table: rows in
 * insertion order and one claimed running row per thread, which is what the
 * partial unique index enforces in the database. The sender of a preview row is
 * `user`; any other draft-chat sender is disabled. The wake service and the chat
 * integration service are container mocks, so call `Container.reset()` on teardown.
 */
export function createTestTurnQueue(user: User = { id: 'user-1', disabled: false } as User) {
	const rows: TestTurnRow[] = [];
	const running = new Map<string, string>();

	const insert = (params: StartExecutionParams & TurnRowValues, status: TestTurnRow['status']) => {
		const id = `exec-${rows.length + 1}`;
		rows.push({
			id,
			threadId: params.threadId,
			agentId: params.agentId,
			projectId: params.projectId,
			status,
			runContext: params.runContext,
			resourceId: params.resourceId,
			userMessage: params.userMessage,
			attachments: params.attachments ?? null,
			source: params.source ?? null,
		});
		return id;
	};
	const hold = (id: string, threadId: string) => {
		if (running.has(threadId)) throw new AgentThreadClaimConflictError();
		running.set(threadId, id);
		return { executionId: id, claimLost: new AbortController().signal };
	};
	/** End the claimed row and free its thread, as the orchestrator's finalize does. */
	const finish = (claim: AgentTurnClaim, status: TestTurnRow['status'] = 'success') => {
		rows.find((row) => row.id === claim.executionId)!.status = status;
		running.delete(claim.threadId);
	};

	const executionRepository = mock<AgentExecutionRepository>();
	executionRepository.countQueuedByThread.mockImplementation(
		async (threadId) =>
			rows.filter((row) => row.threadId === threadId && row.status === 'queued').length,
	);
	executionRepository.findQueuedByThread.mockImplementation(
		async (threadId) =>
			rows.filter(
				(row) => row.threadId === threadId && row.status === 'queued',
			) as unknown as AgentExecution[],
	);
	executionRepository.findThreadIdsWithQueued.mockImplementation(async () => [
		...new Set(rows.filter((row) => row.status === 'queued').map((row) => row.threadId)),
	]);

	const executionService = mock<AgentExecutionService>();
	executionService.recordQueuedExecution.mockImplementation(async (params) =>
		insert(params, 'queued'),
	);
	executionService.startClaimedExecutionRecording.mockImplementation(async (params) => {
		if (running.has(params.threadId)) throw new AgentThreadClaimConflictError();
		return hold(insert(params, 'running'), params.threadId);
	});
	executionService.claimQueuedExecution.mockImplementation(async (scope) => {
		const row = rows.find((candidate) => candidate.id === scope.executionId);
		if (row?.status !== 'queued') return null;
		const held = hold(scope.executionId, scope.threadId);
		row.status = 'running';
		return held;
	});
	executionService.failQueuedExecution.mockImplementation(async (scope, error) => {
		Object.assign(rows.find((row) => row.id === scope.executionId)!, { status: 'error', error });
	});
	executionService.failClaimedExecution.mockImplementation(async (scope, error) => {
		const row = rows.find((candidate) => candidate.id === scope.executionId)!;
		if (row.status !== 'running') return false;
		Object.assign(row, { status: 'error', error });
		running.delete(scope.threadId);
		return true;
	});
	executionService.hasSuspendedRun.mockResolvedValue(false);

	const threadRepository = mock<AgentExecutionThreadRepository>();
	threadRepository.findOneBy.mockImplementation(async (where) => {
		const id = Array.isArray(where) ? where[0]?.id : where.id;
		const row = rows.find((candidate) => candidate.threadId === id);
		return row
			? ({
					id: row.threadId,
					agentId: row.agentId,
					projectId: row.projectId,
				} as AgentExecutionThread)
			: null;
	});
	const agentRepository = mock<AgentRepository>();
	agentRepository.findSummariesByIds.mockImplementation(async ([id]) => [
		{
			id,
			name: 'Agent',
			projectId: rows.find((row) => row.agentId === id)?.projectId ?? 'project-1',
		},
	]);
	const userRepository = mock<UserRepository>();
	userRepository.findByIdWithRole.mockImplementation(async (id) =>
		id === user.id ? user : ({ id, disabled: true } as User),
	);
	const checkpointStorage = mock<N8NCheckpointStorage>();
	checkpointStorage.findSuspendedForThread.mockResolvedValue(null);
	const orchestrator = mock<AgentExecutionOrchestratorService>();

	const wakeService = mock<AgentWakeService>();
	Container.set(AgentWakeService, wakeService);
	const chatIntegrationService = mock<ChatIntegrationService>();
	Container.set(ChatIntegrationService, chatIntegrationService);
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	const service = new AgentTurnQueueService(
		logger,
		executionRepository,
		threadRepository,
		executionService,
		agentRepository,
		userRepository,
		checkpointStorage,
		orchestrator,
	);
	return {
		service,
		rows,
		finish,
		executionRepository,
		executionService,
		checkpointStorage,
		orchestrator,
		wakeService,
		chatIntegrationService,
	};
}
