import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';

import { userHasScopes } from '@/permissions.ee/check-access';

import { createTestTurnQueue } from './test-utils/turn-queue';
import type { AgentTurnClaim, AgentTurnSubmission } from '../agent-turn-queue.service';

vi.mock('@/permissions.ee/check-access', () => ({
	userHasScopes: vi.fn().mockResolvedValue(true),
}));

const agentId = 'agent-1';
const projectId = 'project-1';
const threadId = 'thread-1';
const user = { id: 'user-1', disabled: false } as User;

function messageTurn(userMessage: string, resourceId = 'draft-chat:user-1'): AgentTurnSubmission {
	return {
		threadId,
		agentId,
		projectId,
		userMessage,
		source: 'n8n-chat',
		resourceId,
		runContext: { kind: 'message' },
	};
}

function resumeTurn(previewChat?: boolean): AgentTurnSubmission {
	return {
		threadId,
		agentId,
		projectId,
		userMessage: null,
		source: 'n8n-chat',
		resourceId: 'draft-chat:user-1',
		runContext: {
			kind: 'resume',
			runId: 'run-1',
			toolCallId: 'tool-1',
			resumeData: { approved: true },
			previewChat,
		},
	};
}

function channelResumeTurn(): AgentTurnSubmission {
	const turn = resumeTurn();
	if (turn.runContext.kind !== 'resume') throw new Error('Expected a resume turn');
	return {
		...turn,
		resourceId: null,
		source: 'slack',
		runContext: {
			...turn.runContext,
			channel: {
				integrationType: 'slack',
				credentialId: 'credential-1',
				thread: { id: 'thread-1', channelId: 'channel-1', isDM: false } as never,
			},
		},
	};
}

function channelMessageTurn(): AgentTurnSubmission {
	return {
		...messageTurn('channel message', 'integration:slack:user-1'),
		source: 'slack',
		runContext: {
			kind: 'message',
			channel: {
				integrationType: 'slack',
				credentialId: 'credential-1',
				thread: { id: 'thread-1', channelId: 'channel-1', isDM: false } as never,
				isNewMention: true,
				conversationThreadId: threadId,
			},
		},
	};
}

/** The queue over its in-memory table, with an orchestrator that ends each row and releases the claim. */
function makeService() {
	const queue = createTestTurnQueue(user);
	const ran: string[] = [];
	queue.orchestrator.executeForChat.mockImplementation(async function* (config, claim) {
		ran.push(config.message);
		yield { type: 'finish', finishReason: 'stop' };
		queue.finish(claim);
		await claim.release();
	});
	queue.orchestrator.resolveResumeThread.mockResolvedValue(threadId);
	queue.orchestrator.resumeForChat.mockImplementation(async function* (config, claim) {
		ran.push(`resume:${config.runId}`);
		yield { type: 'finish', finishReason: 'stop' };
		queue.finish(claim);
		await claim.release();
	});
	return { ...queue, ran };
}

const settled = async (assertion: () => void) => await vi.waitFor(assertion);

describe('AgentTurnQueueService', () => {
	afterEach(() => {
		Container.reset();
		vi.mocked(userHasScopes).mockResolvedValue(true);
	});

	it('runs blocked messages in FIFO order', async () => {
		const { service, rows, ran, finish } = makeService();
		const first = await service.submit(messageTurn('first'));
		if (first.status !== 'claimed') throw new Error('Expected the first turn to be claimed');
		expect(await service.submit(messageTurn('second'))).toEqual({
			status: 'queued',
			executionId: 'exec-2',
		});
		expect(await service.submit(messageTurn('third'))).toEqual({
			status: 'queued',
			executionId: 'exec-3',
		});
		expect(await service.tryRunNow(messageTurn('wake'))).toBeNull();

		finish(first.claim);
		await first.claim.release();

		await settled(() => expect(ran).toEqual(['second', 'third']));
		expect(rows.map((row) => row.status)).toEqual(['success', 'success', 'success']);
	});

	it('hands off attachment ownership after persistence and before claiming', async () => {
		const { service, rows, executionService } = makeService();
		const claimError = new Error('claim failed');
		const onPersisted = vi.fn();
		const attachment = {
			id: 'attachment-1',
			fileName: 'notes.txt',
			mimeType: 'text/plain',
			sizeBytes: 5,
		};
		executionService.claimQueuedExecution.mockRejectedValue(claimError);

		await expect(
			service.submit({ ...messageTurn('hello'), attachments: [attachment] }, onPersisted),
		).rejects.toBe(claimError);

		expect(rows).toEqual([
			expect.objectContaining({
				id: 'exec-1',
				status: 'error',
				error: 'claim failed',
				attachments: [attachment],
			}),
		]);
		expect(onPersisted).toHaveBeenCalledWith('exec-1');
	});

	it('keeps concurrent messages in enqueue order when both observe an idle thread', async () => {
		const { service, rows, executionService } = makeService();
		const recordQueuedExecution = executionService.recordQueuedExecution.getMockImplementation();
		if (!recordQueuedExecution) throw new Error('Expected queued recording implementation');
		const firstInserted = createDeferredPromise();
		const releaseFirst = createDeferredPromise();
		executionService.recordQueuedExecution.mockImplementation(async (params) => {
			if (params.userMessage === 'second') await firstInserted.promise;
			const executionId = await recordQueuedExecution(params);
			if (params.userMessage === 'first') {
				firstInserted.resolve();
				await releaseFirst.promise;
			}
			return executionId;
		});

		const firstSubmission = service.submit(messageTurn('first'));
		const secondSubmission = service.submit(messageTurn('second'));
		const second = await secondSubmission;
		releaseFirst.resolve();
		const first = await firstSubmission;

		expect(first).toEqual({
			status: 'claimed',
			claim: expect.objectContaining({ executionId: 'exec-1', threadId }),
		});
		expect(second).toEqual({ status: 'queued', executionId: 'exec-2' });
		expect(rows.map(({ userMessage, status }) => ({ userMessage, status }))).toEqual([
			{ userMessage: 'first', status: 'running' },
			{ userMessage: 'second', status: 'queued' },
		]);
	});

	it('runs a blocked resume before older message rows', async () => {
		const { service, ran, finish, orchestrator } = makeService();
		const first = await service.tryRunNow(messageTurn('first'));
		if (!first) throw new Error('Expected the first turn to be claimed');
		await service.submit(messageTurn('second'));
		expect(await service.submit(resumeTurn(false))).toEqual({
			status: 'queued',
			executionId: 'exec-3',
		});

		finish(first);
		await first.release();

		await settled(() => expect(ran).toEqual(['resume:run-1', 'second']));
		expect(orchestrator.resumeForChat).toHaveBeenCalledWith(
			expect.objectContaining({ previewChat: false }),
			expect.objectContaining({ threadId }),
		);
	});

	it('claims a resume while the thread awaits a human response', async () => {
		const { service, rows, executionService, checkpointStorage } = makeService();
		executionService.hasSuspendedRun.mockResolvedValue(true);
		checkpointStorage.findSuspendedForThread.mockResolvedValue({} as never);

		const resume = await service.submit(resumeTurn());
		if (resume.status !== 'claimed') throw new Error('Expected the resume to be claimed');

		expect(rows).toEqual([
			expect.objectContaining({ id: resume.claim.executionId, status: 'running' }),
		]);
	});

	it('holds a message while the thread awaits a human response', async () => {
		const { service, rows, ran, executionService, checkpointStorage, finish } = makeService();
		executionService.hasSuspendedRun.mockResolvedValue(true);
		checkpointStorage.findSuspendedForThread.mockResolvedValue({} as never);

		expect(await service.submit(messageTurn('while waiting'))).toEqual({
			status: 'queued',
			executionId: 'exec-1',
		});
		const resume = await service.submit(resumeTurn());
		if (resume.status !== 'claimed') throw new Error('Expected the resume to be claimed');

		checkpointStorage.findSuspendedForThread.mockResolvedValue(null);
		finish(resume.claim);
		await resume.claim.release();

		await settled(() => expect(ran).toEqual(['while waiting']));
		expect(rows.map((row) => row.status)).toEqual(['success', 'success']);
	});

	it('fails a blocked message whose sender is no longer active and continues the drain', async () => {
		const { service, rows, ran, finish } = makeService();
		const first = await service.submit(messageTurn('first'));
		if (first.status !== 'claimed') throw new Error('Expected the first turn to be claimed');
		await service.submit(messageTurn('disabled sender', 'draft-chat:user-2'));
		await service.submit(messageTurn('third'));

		finish(first.claim);
		await first.claim.release();

		await settled(() => expect(ran).toEqual(['third']));
		expect(rows[1]).toMatchObject({
			status: 'error',
			error: 'The user who sent this message is no longer active',
		});
	});

	it('runs blocked channel turns through their reconstructed bridge', async () => {
		const { service, finish, chatIntegrationService } = makeService();
		const runQueuedResume = vi.fn(async (_row, claim: AgentTurnClaim) => {
			finish(claim);
			await claim.release();
		});
		const runQueuedMessage = vi.fn(async (_row, claim: AgentTurnClaim) => {
			finish(claim);
			await claim.release();
		});
		chatIntegrationService.getBridge.mockReturnValue({
			runQueuedResume,
			runQueuedMessage,
		} as never);
		const first = await service.tryRunNow(messageTurn('first'));
		if (!first) throw new Error('Expected the first turn to be claimed');
		await service.submit(channelMessageTurn());
		await service.submit(channelResumeTurn());

		finish(first);
		await first.release();

		await settled(() =>
			expect(runQueuedResume).toHaveBeenCalledWith(
				expect.objectContaining({
					runContext: expect.objectContaining({
						kind: 'resume',
						channel: expect.objectContaining({ integrationType: 'slack' }),
					}),
				}),
				expect.objectContaining({ threadId }),
			),
		);
		await settled(() =>
			expect(runQueuedMessage).toHaveBeenCalledWith(
				expect.objectContaining({
					userMessage: 'channel message',
					runContext: expect.objectContaining({
						kind: 'message',
						channel: expect.objectContaining({ integrationType: 'slack' }),
					}),
				}),
				expect.objectContaining({ threadId }),
			),
		);
	});

	it('leaves a blocked resume queued when its promotion conflicts with another run', async () => {
		const { service, rows, ran, orchestrator, executionRepository, executionService, finish } =
			makeService();
		const first = await service.tryRunNow(messageTurn('first'));
		if (!first) throw new Error('Expected the first turn to be claimed');
		await service.submit(resumeTurn());

		// The sweeper's pass while the first turn still runs, e.g. on another main.
		expect(await executionRepository.findThreadIdsWithQueued()).toEqual([threadId]);
		await service.drainAll();
		await settled(() =>
			expect(executionService.claimQueuedExecution).toHaveBeenCalledWith(
				expect.objectContaining({ executionId: 'exec-2', threadId }),
				expect.any(Date),
			),
		);
		await new Promise((resolve) => setImmediate(resolve));

		expect(orchestrator.resumeForChat).not.toHaveBeenCalled();
		expect(rows[1].status).toBe('queued');

		finish(first);
		await first.release();
		await settled(() => expect(ran).toEqual(['resume:run-1']));
	});

	it('fails a persisted turn when its initial promotion errors', async () => {
		const { service, rows, executionService } = makeService();
		const claimError = new Error('claim failed');
		executionService.claimQueuedExecution.mockRejectedValue(claimError);

		await expect(service.submit(resumeTurn())).rejects.toBe(claimError);

		expect(rows).toEqual([expect.objectContaining({ status: 'error', error: 'claim failed' })]);
	});

	it('ends a claimed turn that never started and runs the blocked resume', async () => {
		const { service, rows, ran } = makeService();
		const first = await service.tryRunNow(messageTurn('first'));
		if (!first) throw new Error('Expected the first turn to be claimed');
		await service.submit(resumeTurn());

		await first.fail(new Error('setup failed'));

		expect(rows[0]).toMatchObject({ status: 'error', error: 'setup failed' });
		await settled(() => expect(ran).toEqual(['resume:run-1']));
	});
});
