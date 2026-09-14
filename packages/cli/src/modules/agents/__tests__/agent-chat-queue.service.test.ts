import type { Logger } from '@n8n/backend-common';
import type { UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentChatAttachmentService } from '../agent-chat-attachment.service';
import { AgentChatQueueService, type QueuedMessageRef } from '../agent-chat-queue.service';
import type { AgentExecutionOrchestratorService } from '../agent-execution-orchestrator.service';
import type { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
import type { AgentExecutionService } from '../agent-execution.service';
import { MAX_AGENT_THREAD_WAITERS } from '../agent-thread-turn-coordinator';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import type {
	AgentExecutionRepository,
	AgentExecutionUserTurn,
} from '../repositories/agent-execution.repository';

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn().mockResolvedValue(true),
}));

const user = { id: 'user-1', disabled: false };
const thread = {
	id: 'thread-1',
	agentId: 'agent-1',
	projectId: 'project-1',
} as AgentExecutionThread;
const ownRef: QueuedMessageRef = {
	executionId: 'exec-1',
	agentId: thread.agentId,
	projectId: thread.projectId,
	resourceId: `draft-chat:${user.id}`,
};

function queuedRow(overrides: Partial<AgentExecutionUserTurn> = {}): AgentExecutionUserTurn {
	return {
		id: 'exec-1',
		threadId: thread.id,
		status: 'queued',
		resourceId: `draft-chat:${user.id}`,
		attachments: null,
		...overrides,
	};
}

function setup() {
	const executionRepository = mock<AgentExecutionRepository>();
	const threadRepository = mock<AgentExecutionThreadRepository>();
	const executionService = mock<AgentExecutionService>();
	const attachmentService = mock<AgentChatAttachmentService>();
	const broadcaster = mock<AgentExecutionUpdateBroadcaster>();
	const userRepository = mock<UserRepository>();
	const orchestrator = mock<AgentExecutionOrchestratorService>();
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);

	threadRepository.findOneBy.mockResolvedValue(thread);
	userRepository.findByIdWithRole.mockResolvedValue(user as never);
	executionRepository.findOldestQueuedByThread.mockResolvedValue(null);

	const service = new AgentChatQueueService(
		logger,
		executionRepository,
		threadRepository,
		executionService,
		attachmentService,
		broadcaster,
		userRepository,
		orchestrator,
	);
	return {
		service,
		executionRepository,
		executionService,
		attachmentService,
		broadcaster,
		userRepository,
		orchestrator,
	};
}

describe('AgentChatQueueService', () => {
	beforeEach(() => {
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	describe('enqueue', () => {
		it('rejects the message with 409 and stores nothing once the thread has its maximum of waiting messages', async () => {
			const { service, executionRepository, executionService } = setup();
			executionRepository.countQueuedByThread.mockResolvedValue(MAX_AGENT_THREAD_WAITERS);

			await expect(
				service.enqueue({
					agentId: thread.agentId,
					agentName: 'Agent',
					projectId: thread.projectId,
					threadId: thread.id,
					message: 'one too many',
					resourceId: ownRef.resourceId,
				}),
			).rejects.toBeInstanceOf(ConflictError);

			expect(executionService.recordQueuedExecution).not.toHaveBeenCalled();
		});
	});

	describe('editQueued and removeQueued', () => {
		it.each([
			['a row of another sender', {}, { resourceId: 'draft-chat:user-2' }, NotFoundError],
			['a row through another agent', {}, { agentId: 'agent-2' }, NotFoundError],
			['a row that already started', { status: 'running' as const }, {}, ConflictError],
		])('reject %s and change nothing', async (_, rowOverrides, refOverrides, errorClass) => {
			const { service, executionRepository, attachmentService, broadcaster } = setup();
			executionRepository.findUserTurnById.mockResolvedValue(
				queuedRow({ attachments: [{ id: 'att-1' }] as never, ...rowOverrides }),
			);
			const ref = { ...ownRef, ...refOverrides };

			await expect(service.editQueued(ref, 'changed')).rejects.toBeInstanceOf(errorClass);
			await expect(service.removeQueued(ref)).rejects.toBeInstanceOf(errorClass);

			expect(executionRepository.updateQueuedMessage).not.toHaveBeenCalled();
			expect(executionRepository.deleteQueued).not.toHaveBeenCalled();
			expect(attachmentService.deleteByIds).not.toHaveBeenCalled();
			expect(broadcaster.notify).not.toHaveBeenCalled();
		});

		it('answers 409 when the row starts between the ownership check and the write', async () => {
			const { service, executionRepository, broadcaster } = setup();
			executionRepository.findUserTurnById.mockResolvedValue(queuedRow());
			executionRepository.updateQueuedMessage.mockResolvedValue(false);
			executionRepository.deleteQueued.mockResolvedValue(false);

			await expect(service.editQueued(ownRef, 'changed')).rejects.toBeInstanceOf(ConflictError);
			await expect(service.removeQueued(ownRef)).rejects.toBeInstanceOf(ConflictError);
			expect(broadcaster.notify).not.toHaveBeenCalled();
		});

		it('removes the row with its attachments and tells every tab', async () => {
			const { service, executionRepository, attachmentService, broadcaster } = setup();
			executionRepository.findUserTurnById.mockResolvedValue(
				queuedRow({ attachments: [{ id: 'att-1' }, { id: 'att-2' }] as never }),
			);
			executionRepository.deleteQueued.mockResolvedValue(true);

			await service.removeQueued(ownRef);

			expect(attachmentService.deleteByIds).toHaveBeenCalledWith(['att-1', 'att-2']);
			expect(broadcaster.notify).toHaveBeenCalledWith({
				projectId: thread.projectId,
				agentId: thread.agentId,
				threadId: thread.id,
				executionId: 'exec-1',
			});
		});
	});

	describe('requestDrain', () => {
		it('runs the waiting rows oldest first, skips the ones that left the queue and stops at a deferred one', async () => {
			const { service, executionRepository, orchestrator } = setup();
			const rows = [
				queuedRow({ id: 'exec-1' }),
				queuedRow({ id: 'exec-2' }),
				queuedRow({ id: 'exec-3' }),
				queuedRow({ id: 'exec-4' }),
			];
			const outcomes: Record<string, 'ran' | 'skipped' | 'deferred'> = {
				'exec-1': 'ran',
				'exec-2': 'skipped',
				'exec-3': 'deferred',
			};
			executionRepository.findOldestQueuedByThread.mockImplementation(async () => rows[0] ?? null);
			orchestrator.executeForQueued.mockImplementation(async ({ executionId }) => {
				const outcome = outcomes[executionId];
				// A deferred row stays queued; a drain that keeps retrying it must fail loudly, not spin.
				if (outcome !== 'deferred') rows.shift();
				if (orchestrator.executeForQueued.mock.calls.length > 3) {
					throw new Error('the drain did not stop at the deferred row');
				}
				return outcome;
			});

			service.requestDrain(thread.id);

			await vi.waitFor(() => expect(orchestrator.executeForQueued).toHaveBeenCalledTimes(3));
			await new Promise((resolve) => setImmediate(resolve));
			expect(
				orchestrator.executeForQueued.mock.calls.map(([config]) => config.executionId),
			).toEqual(['exec-1', 'exec-2', 'exec-3']);
			expect(orchestrator.executeForQueued).toHaveBeenCalledWith(
				expect.objectContaining({
					agentId: thread.agentId,
					projectId: thread.projectId,
					threadId: thread.id,
					user,
					resourceId: `draft-chat:${user.id}`,
				}),
			);
			expect(rows.map((row) => row.id)).toEqual(['exec-3', 'exec-4']);
		});

		it('ends a row whose sender can no longer run the agent instead of retrying it', async () => {
			const { service, executionRepository, executionService, orchestrator, userRepository } =
				setup();
			const rows = [
				queuedRow({ id: 'exec-gone', resourceId: 'draft-chat:user-gone' }),
				queuedRow({ id: 'exec-2' }),
			];
			executionRepository.findOldestQueuedByThread.mockImplementation(async () => rows[0] ?? null);
			userRepository.findByIdWithRole.mockImplementation(async (id) =>
				id === user.id ? (user as never) : null,
			);
			executionService.failQueuedExecution.mockImplementation(async () => {
				rows.shift();
			});
			orchestrator.executeForQueued.mockImplementation(async () => {
				rows.shift();
				return 'ran';
			});

			service.requestDrain(thread.id);

			await vi.waitFor(() => expect(orchestrator.executeForQueued).toHaveBeenCalledTimes(1));
			expect(executionService.failQueuedExecution).toHaveBeenCalledWith(
				{
					id: 'exec-gone',
					threadId: thread.id,
					agentId: thread.agentId,
					projectId: thread.projectId,
				},
				expect.objectContaining({
					message: 'The user who sent this message is no longer active',
				}),
			);
			expect(orchestrator.executeForQueued).toHaveBeenCalledWith(
				expect.objectContaining({ executionId: 'exec-2' }),
			);
		});
	});
});
