import type { User } from '@n8n/db';
import { Container } from '@n8n/di';

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

	it('runs a blocked resume when the active turn releases its claim', async () => {
		const { service, ran, finish, orchestrator } = makeService();
		const first = await service.tryRunNow(messageTurn('first'));
		if (!first) throw new Error('Expected the first turn to be claimed');
		expect(await service.submit(resumeTurn(false))).toEqual({
			status: 'queued',
			executionId: 'exec-2',
		});

		finish(first);
		await first.release();

		await settled(() => expect(ran).toEqual(['resume:run-1']));
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

	it('runs a blocked channel resume through its reconstructed bridge', async () => {
		const { service, finish, chatIntegrationService } = makeService();
		const runQueuedResume = vi.fn(async (_row, claim: AgentTurnClaim) => {
			finish(claim);
			await claim.release();
		});
		chatIntegrationService.getBridge.mockReturnValue({ runQueuedResume } as never);
		const first = await service.tryRunNow(messageTurn('first'));
		if (!first) throw new Error('Expected the first turn to be claimed');
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
