import type { User } from '@n8n/db';
import { Container } from '@n8n/di';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import { userHasScopes } from '@/permissions.ee/check-access';

import { createTestTurnQueue } from './test-utils/turn-queue';
import type { AgentTurnSubmission } from '../agent-turn-queue.service';
import type { AgentChatBridge } from '../integrations/agent-chat-bridge';

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

function resumeTurn(): AgentTurnSubmission {
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

	it('claims the thread for a message on an idle thread', async () => {
		const { service, rows } = makeService();

		const result = await service.submit(messageTurn('hello'));

		expect(result).toEqual({
			status: 'claimed',
			claim: expect.objectContaining({ executionId: 'exec-1', threadId }),
		});
		expect(rows).toEqual([
			expect.objectContaining({ id: 'exec-1', status: 'running', runContext: { kind: 'message' } }),
		]);
	});

	it('hands off attachment ownership after persistence and before claiming', async () => {
		const { service, rows, executionService } = makeService();
		const claimError = new Error('claim failed');
		const onPersisted = vi.fn();
		const attachment = {
			id: 'att-1',
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
				status: 'queued',
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

	it('queues behind the running turn and runs the rows oldest-first once it releases', async () => {
		const { service, rows, ran, finish, orchestrator, wakeService } = makeService();
		const first = await service.submit(messageTurn('first'));
		if (first.status !== 'claimed') throw new Error('Expected the first turn to be claimed');

		const second = await service.submit(messageTurn('second'));
		const third = await service.submit(messageTurn('third'));

		expect(second).toEqual({ status: 'queued', executionId: 'exec-2' });
		expect(third).toEqual({ status: 'queued', executionId: 'exec-3' });
		expect(orchestrator.executeForChat).not.toHaveBeenCalled();

		finish(first.claim);
		await first.claim.release();

		await settled(() => expect(ran).toEqual(['second', 'third']));
		expect(rows.map((row) => row.status)).toEqual(['success', 'success', 'success']);
		expect(orchestrator.executeForChat).toHaveBeenLastCalledWith(
			expect.objectContaining({
				agentId,
				projectId,
				message: 'third',
				user,
				memory: { threadId, resourceId: 'draft-chat:user-1' },
				previewChat: true,
			}),
			expect.objectContaining({ executionId: 'exec-3', threadId }),
		);
		// Every finished user turn asks for pending background results.
		expect(wakeService.onParentTurnFinished).toHaveBeenCalledWith(threadId);
	});

	it('runs a queued resume before the older message rows', async () => {
		const { service, ran, finish } = makeService();
		const first = await service.submit(messageTurn('first'));
		if (first.status !== 'claimed') throw new Error('Expected the first turn to be claimed');
		await service.submit(messageTurn('second'));
		expect(await service.submit(resumeTurn())).toEqual({ status: 'queued', executionId: 'exec-3' });

		finish(first.claim);
		await first.claim.release();

		await settled(() => expect(ran).toEqual(['resume:run-1', 'second']));
	});

	it('defers a message while the thread awaits a human response, and claims at once for the resume', async () => {
		const { service, ran, rows, executionService, checkpointStorage, finish } = makeService();
		executionService.hasSuspendedRun.mockResolvedValue(true);
		checkpointStorage.findSuspendedForThread.mockResolvedValue({} as never);

		expect(await service.submit(messageTurn('while waiting'))).toEqual({
			status: 'queued',
			executionId: 'exec-1',
		});
		const resume = await service.submit(resumeTurn());
		if (resume.status !== 'claimed') throw new Error('Expected the resume to be claimed');

		// The human response ends the suspension; the waiting message runs after it.
		checkpointStorage.findSuspendedForThread.mockResolvedValue(null);
		finish(resume.claim);
		await resume.claim.release();

		await settled(() => expect(ran).toEqual(['while waiting']));
		expect(rows.map((row) => row.status)).toEqual(['success', 'success']);
	});

	it('leaves a row queued and stops the drain when the promotion conflicts with another run', async () => {
		const { service, rows, ran, orchestrator, executionRepository, executionService, finish } =
			makeService();
		const first = await service.submit(messageTurn('first'));
		if (first.status !== 'claimed') throw new Error('Expected the first turn to be claimed');
		await service.submit(messageTurn('second'));

		// The sweeper's pass while the first turn still runs, e.g. on another main.
		expect(await executionRepository.findThreadIdsWithQueued()).toEqual([threadId]);
		await service.drainAll();
		await settled(() =>
			expect(executionService.claimQueuedExecution).toHaveBeenCalledWith(
				'exec-2',
				threadId,
				expect.any(Date),
			),
		);
		await new Promise((resolve) => setImmediate(resolve));

		expect(orchestrator.executeForChat).not.toHaveBeenCalled();
		expect(rows[1].status).toBe('queued');

		finish(first.claim);
		await first.claim.release();
		await settled(() => expect(ran).toEqual(['second']));
	});

	it('ends a row whose sender is disabled as an error execution and drains on', async () => {
		const { service, rows, ran, finish } = makeService();
		const first = await service.submit(messageTurn('first'));
		if (first.status !== 'claimed') throw new Error('Expected the first turn to be claimed');
		await service.submit(messageTurn('from a disabled user', 'draft-chat:user-2'));
		await service.submit(messageTurn('third'));

		finish(first.claim);
		await first.claim.release();

		await settled(() => expect(ran).toEqual(['third']));
		expect(rows[1]).toMatchObject({
			status: 'error',
			error: 'The user who sent this message is no longer active',
		});
	});

	it('ends a claimed turn that never started as an error execution and runs the waiting rows', async () => {
		const { service, rows, ran } = makeService();
		const first = await service.submit(messageTurn('first'));
		if (first.status !== 'claimed') throw new Error('Expected the first turn to be claimed');
		await service.submit(messageTurn('second'));

		await first.claim.fail(new Error('setup failed'));

		expect(rows[0]).toMatchObject({ status: 'error', error: 'setup failed' });
		await settled(() => expect(ran).toEqual(['second']));
	});

	it('runs a channel row through its bridge and leaves it queued while this main has none', async () => {
		const { service, rows, finish, chatIntegrationService } = makeService();
		const bridge = mock<AgentChatBridge>();
		bridge.runQueuedMessage.mockImplementation(async (_row, claim) => {
			finish(claim);
			await claim.release();
		});
		const first = await service.submit(messageTurn('first'));
		if (first.status !== 'claimed') throw new Error('Expected the first turn to be claimed');
		await service.submit({
			...messageTurn('from slack', 'integration:slack:u1'),
			runContext: {
				kind: 'message',
				channel: {
					integrationType: 'slack',
					credentialId: 'cred-1',
					thread: {
						_type: 'chat:Thread',
						adapterName: 'slack',
						channelId: 'slack:C1',
						id: 'slack:C1:1',
						isDM: false,
					},
					isNewMention: true,
					conversationThreadId: threadId,
				},
			},
		});

		// A leader-only bridge that lives on another main: the row waits for that main's pass.
		chatIntegrationService.getBridge.mockReturnValue(undefined);
		finish(first.claim);
		await first.claim.release();
		await new Promise((resolve) => setImmediate(resolve));
		expect(rows[1].status).toBe('queued');

		chatIntegrationService.getBridge.mockReturnValue(bridge);
		await service.drainAll();

		await settled(() => expect(rows[1].status).toBe('success'));
		expect(chatIntegrationService.getBridge).toHaveBeenCalledWith(agentId, 'slack', 'cred-1');
		expect(bridge.runQueuedMessage).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'exec-2' }),
			expect.objectContaining({ executionId: 'exec-2', threadId }),
		);
	});

	describe('tryRunNow', () => {
		it('claims a running row on an idle thread and requests no wake after a wake run', async () => {
			const { service, rows, finish, wakeService } = makeService();

			const claim = await service.tryRunNow(messageTurn('wake'), { wake: true });

			expect(claim).toEqual(expect.objectContaining({ executionId: 'exec-1', threadId }));
			expect(rows[0].status).toBe('running');

			finish(claim!);
			await claim!.release();
			expect(wakeService.onParentTurnFinished).not.toHaveBeenCalled();
		});

		it('writes nothing while a turn runs or rows wait', async () => {
			const { service, rows } = makeService();
			const first = await service.submit(messageTurn('first'));
			if (first.status !== 'claimed') throw new Error('Expected the first turn to be claimed');

			expect(await service.tryRunNow(messageTurn('wake'))).toBeNull();

			await service.submit(messageTurn('second'));
			expect(await service.tryRunNow(messageTurn('wake'))).toBeNull();
			expect(rows.map((row) => row.userMessage)).toEqual(['first', 'second']);
		});
	});
});
