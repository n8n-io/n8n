import type { Logger } from '@n8n/backend-common';
import type { ExecutionRepository } from '@n8n/db';
import type { ErrorReporter } from 'n8n-core';
import type { ExecutionStatus } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ExecutionPushResumeService } from '@/executions/execution-push-resume.service';
import type { Push } from '@/push';
import type { OnPushMessage } from '@/push/types';
import type { AccessService } from '@/services/access.service';

describe('ExecutionPushResumeService', () => {
	const logger = mock<Logger>();
	const errorReporter = mock<ErrorReporter>();
	const push = mock<Push>();
	const executionRepository = mock<ExecutionRepository>();
	const accessService = mock<AccessService>();

	const pushRef = 'push-ref-1';
	const userId = 'user-1';

	let handleMessage: (event: OnPushMessage) => Promise<void>;

	beforeEach(() => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		accessService.hasReadAccess.mockResolvedValue(true);

		const service = new ExecutionPushResumeService(
			logger,
			errorReporter,
			push,
			executionRepository,
			accessService,
		);
		service.init();

		// Capture the listener the service registered on the push `message` channel.
		const call = push.on.mock.calls.find(([event]) => event === 'message');
		handleMessage = call![1] as unknown as (event: OnPushMessage) => Promise<void>;
	});

	const resumeEvent = (awaiting: string[]): OnPushMessage => ({
		pushRef,
		userId,
		msg: { type: 'resume', data: { awaiting } },
	});

	const stubExecution = (id: string, status: ExecutionStatus, workflowId = 'wf-1') => ({
		id,
		workflowId,
		status,
	});

	describe('terminal executions are re-delivered', () => {
		it('replays executionFinished with meta.replayed for a completed execution', async () => {
			executionRepository.findStatusByIds.mockResolvedValue([stubExecution('e1', 'success')]);

			await handleMessage(resumeEvent(['e1']));

			expect(push.send).toHaveBeenCalledWith(
				{
					type: 'executionFinished',
					data: { executionId: 'e1', workflowId: 'wf-1', status: 'success' },
					meta: expect.objectContaining({
						replayed: true,
						eventId: expect.any(String),
						ts: expect.any(String),
					}),
				},
				pushRef,
			);
			expect(push.send).toHaveBeenCalledWith(
				{ type: 'resumeComplete', data: { replayed: ['e1'] } },
				pushRef,
			);
		});

		it.each<ExecutionStatus>(['success', 'error', 'crashed', 'canceled'])(
			'treats status "%s" as terminal and replays executionFinished',
			async (status) => {
				executionRepository.findStatusByIds.mockResolvedValue([stubExecution('e1', status)]);

				await handleMessage(resumeEvent(['e1']));

				expect(push.send).toHaveBeenCalledWith(
					expect.objectContaining({
						type: 'executionFinished',
						data: expect.objectContaining({ status }),
					}),
					pushRef,
				);
			},
		);

		it('replays executionWaiting for a waiting execution (terminal-class for the spinner)', async () => {
			executionRepository.findStatusByIds.mockResolvedValue([stubExecution('e1', 'waiting')]);

			await handleMessage(resumeEvent(['e1']));

			expect(push.send).toHaveBeenCalledWith(
				{
					type: 'executionWaiting',
					data: { executionId: 'e1' },
					meta: expect.objectContaining({ replayed: true }),
				},
				pushRef,
			);
			expect(push.send).toHaveBeenCalledWith(
				{ type: 'resumeComplete', data: { replayed: ['e1'] } },
				pushRef,
			);
		});
	});

	describe('non-terminal executions stay silent', () => {
		it.each<ExecutionStatus>(['running', 'new', 'unknown'])(
			'sends no replay for an in-progress execution (status "%s")',
			async (status) => {
				executionRepository.findStatusByIds.mockResolvedValue([stubExecution('e1', status)]);

				await handleMessage(resumeEvent(['e1']));

				expect(push.send).toHaveBeenCalledTimes(1);
				expect(push.send).toHaveBeenCalledWith(
					{ type: 'resumeComplete', data: { replayed: [] } },
					pushRef,
				);
			},
		);
	});

	describe('unknown / pruned ids', () => {
		it('does not crash and replays nothing when the id is absent from the DB', async () => {
			executionRepository.findStatusByIds.mockResolvedValue([]);

			await handleMessage(resumeEvent(['gone']));

			expect(accessService.hasReadAccess).not.toHaveBeenCalled();
			expect(push.send).toHaveBeenCalledTimes(1);
			expect(push.send).toHaveBeenCalledWith(
				{ type: 'resumeComplete', data: { replayed: [] } },
				pushRef,
			);
		});
	});

	describe('authorization', () => {
		it('does not replay executions the user cannot read', async () => {
			executionRepository.findStatusByIds.mockResolvedValue([stubExecution('e1', 'success')]);
			accessService.hasReadAccess.mockResolvedValue(false);

			await handleMessage(resumeEvent(['e1']));

			expect(push.send).toHaveBeenCalledTimes(1);
			expect(push.send).toHaveBeenCalledWith(
				{ type: 'resumeComplete', data: { replayed: [] } },
				pushRef,
			);
		});
	});

	describe('mixed batch', () => {
		it('replays only the terminal, authorized ids and reports them in resumeComplete', async () => {
			executionRepository.findStatusByIds.mockResolvedValue([
				stubExecution('done', 'success'),
				stubExecution('busy', 'running'),
			]);

			await handleMessage(resumeEvent(['done', 'busy', 'pruned']));

			expect(push.send).toHaveBeenCalledWith(
				expect.objectContaining({
					type: 'executionFinished',
					data: expect.objectContaining({ executionId: 'done' }),
				}),
				pushRef,
			);
			expect(push.send).toHaveBeenCalledWith(
				{ type: 'resumeComplete', data: { replayed: ['done'] } },
				pushRef,
			);
			expect(push.send).toHaveBeenCalledTimes(2);
		});
	});

	describe('handshake is always closed', () => {
		it('sends resumeComplete without a DB read when awaiting is empty', async () => {
			await handleMessage(resumeEvent([]));

			expect(executionRepository.findStatusByIds).not.toHaveBeenCalled();
			expect(push.send).toHaveBeenCalledTimes(1);
			expect(push.send).toHaveBeenCalledWith(
				{ type: 'resumeComplete', data: { replayed: [] } },
				pushRef,
			);
		});
	});

	describe('messages that are not a valid resume', () => {
		it('ignores a message of another type', async () => {
			await handleMessage({ pushRef, userId, msg: { type: 'workflowOpened', workflowId: 'wf-1' } });

			expect(push.send).not.toHaveBeenCalled();
			expect(executionRepository.findStatusByIds).not.toHaveBeenCalled();
		});

		it('ignores a resume message exceeding the awaiting cap', async () => {
			const tooMany = Array.from({ length: 51 }, (_, i) => `e${i}`);

			await handleMessage(resumeEvent(tooMany));

			expect(push.send).not.toHaveBeenCalled();
			expect(executionRepository.findStatusByIds).not.toHaveBeenCalled();
		});
	});

	describe('error handling', () => {
		it('reports to the error reporter and does not throw when a DB read fails', async () => {
			executionRepository.findStatusByIds.mockRejectedValue(new Error('db down'));

			await expect(handleMessage(resumeEvent(['e1']))).resolves.toBeUndefined();

			expect(errorReporter.error).toHaveBeenCalled();
			expect(push.send).not.toHaveBeenCalled();
		});
	});
});
