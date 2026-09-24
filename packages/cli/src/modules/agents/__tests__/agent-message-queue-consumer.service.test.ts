import { mockLogger } from '@n8n/backend-test-utils';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { User, UserRepository } from '@n8n/db';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mock } from 'vitest-mock-extended';

import type { CredentialsService } from '@/credentials/credentials.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import type { AgentChatExecutionService } from '../agent-chat-execution.service';
import type { AgentExecutionService } from '../agent-execution.service';
import { AgentMessageQueueConsumer } from '../agent-message-queue-consumer.service';
import type { AgentMessageQueueService, ClaimedAgentMessage } from '../agent-message-queue.service';
import type { AgentQueuedPreviewStreamService } from '../agent-queued-preview-stream.service';
import type { AgentTestRunService } from '../agent-test-run.service';
import type { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import type { AgentMessageQueue } from '../entities/agent-message-queue.entity';
import type { AgentChatBridge } from '../integrations/agent-chat-bridge';
import type { ChatIntegrationService } from '../integrations/chat-integration.service';
import type { AgentMessageQueueRepository } from '../repositories/agent-message-queue.repository';
import type { QueuedIntegrationMessage } from '../types/agent-queued-message';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

describe('AgentMessageQueueConsumer', () => {
	const queue = mock<AgentMessageQueueService>();
	const repository = mock<AgentMessageQueueRepository>();
	const executions = mock<AgentExecutionService>();
	const streams = mock<AgentQueuedPreviewStreamService>();
	const testRuns = mock<AgentTestRunService>();
	const users = mock<UserRepository>();
	const chatExecutions = mock<AgentChatExecutionService>();
	const integrations = mock<ChatIntegrationService>();
	const sender = { send: vi.fn(), close: vi.fn(async () => {}) };
	let consumer: AgentMessageQueueConsumer;

	function claim(threadId: string, integration = false): ClaimedAgentMessage {
		return {
			item: mock<AgentMessageQueue>({
				id: threadId,
				threadId,
				source: integration ? 'slack' : 'chat',
				payload: integration
					? mock<QueuedIntegrationMessage>({
							kind: 'integration',
							message: 'input',
							credentialId: 'credential',
							platformThreadId: 'slack:channel:thread',
						})
					: { kind: 'preview', message: 'input', userId: 'user', resourceId: 'draft-chat:user' },
			}),
			thread: mock<AgentExecutionThread>({ id: threadId, agentId: 'agent', projectId: 'project' }),
			admission: { executionId: `execution-${threadId}`, startedAt: new Date() },
			recording: {
				threadId,
				agentId: 'agent',
				agentName: 'Agent',
				projectId: 'project',
				userMessage: 'input',
				access: { accessScope: 'user', ownerId: 'user' },
			},
		};
	}

	beforeEach(() => {
		vi.resetAllMocks();
		vi.mocked(userHasScopes).mockResolvedValue(true);
		users.findByIdWithRole.mockResolvedValue(mock<User>({ id: 'user', disabled: false }));
		repository.findThreadIds.mockResolvedValue([]);
		executions.getAbortSignal.mockImplementation(() => new AbortController().signal);
		streams.createSender.mockReturnValue(sender);
		chatExecutions.settle.mockImplementation(async (_id, finalize) => await finalize());
		testRuns.prepareDraftRun.mockResolvedValue({
			status: 'ready',
			sessionId: 'session',
			sessionMode: 'existing',
		});
		testRuns.executePreparedDraftRun.mockResolvedValue({
			status: 'completed',
			response: '',
			executionId: 'execution-session',
		});
		consumer = new AgentMessageQueueConsumer(
			queue,
			repository,
			executions,
			streams,
			testRuns,
			users,
			mock<CredentialsService>(),
			chatExecutions,
			integrations,
			mockLogger(),
		);
	});

	afterEach(() => consumer.stop());

	it('runs independent sessions without waiting and reuses each claimed execution', async () => {
		const first = claim('first');
		const second = claim('second');
		const waiting = createDeferredPromise();
		repository.findThreadIds.mockResolvedValue(['first', 'second']);
		queue.claimNext
			.mockResolvedValueOnce(first)
			.mockResolvedValueOnce(second)
			.mockResolvedValue(null);
		testRuns.executePreparedDraftRun.mockImplementation(async (input) => {
			if (input.sessionId === 'first') await waiting.promise;
			return {
				status: 'completed',
				response: '',
				executionId: input.admittedExecution!.executionId,
			};
		});
		consumer.start();
		try {
			await vi.waitFor(() =>
				expect(queue.settle).toHaveBeenCalledWith('second', second.admission.executionId),
			);
			expect(queue.settle).not.toHaveBeenCalledWith('first', first.admission.executionId);
			expect(testRuns.prepareDraftRun).toHaveBeenCalledWith(
				expect.objectContaining({
					newSession: false,
					user: expect.objectContaining({ id: 'user' }),
				}),
			);
			expect(testRuns.executePreparedDraftRun).toHaveBeenCalledWith(
				expect.objectContaining({
					sessionId: 'first',
					sessionMode: 'existing',
					admittedExecution: first.admission,
				}),
			);
		} finally {
			waiting.resolve();
		}
		await vi.waitFor(() =>
			expect(queue.settle).toHaveBeenCalledWith('first', first.admission.executionId),
		);
	});

	it.each(['revoked access', 'invalid draft'] as const)(
		'records %s on the claimed execution and releases the item',
		async (failure) => {
			const item = claim('session');
			if (failure === 'revoked access') vi.mocked(userHasScopes).mockResolvedValue(false);
			else
				testRuns.prepareDraftRun.mockResolvedValue({
					status: 'agent_misconfigured',
					missing: ['model'],
				});
			repository.findThreadIds.mockResolvedValue(['session']);
			queue.claimNext.mockResolvedValueOnce(item).mockResolvedValue(null);
			consumer.start();
			await vi.waitFor(() =>
				expect(queue.settle).toHaveBeenCalledWith('session', item.admission.executionId),
			);
			expect(queue.recordFailure).toHaveBeenCalledWith(
				item,
				expect.any(Error),
				expect.any(AbortSignal),
			);
			expect(testRuns.executePreparedDraftRun).not.toHaveBeenCalled();
			expect(sender.send).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
		},
	);

	it('leaves integration work pending until its bridge is available and stops admission during shutdown', async () => {
		const item = claim('session', true);
		const checked = createDeferredPromise();
		const resume = createDeferredPromise();
		const release = vi.fn();
		repository.findThreadIds.mockResolvedValue(['session']);
		queue.claimNext.mockImplementationOnce(async (_threadId, canConsume) => {
			expect(await canConsume(item.item, item.thread, {})).toBe(false);
			integrations.acquireQueueBridge.mockReturnValue({ bridge: mock<AgentChatBridge>(), release });
			expect(await canConsume(item.item, item.thread, {})).toBe(true);
			checked.resolve();
			await resume.promise;
			expect(await canConsume(item.item, item.thread, {})).toBe(false);
			return null;
		});
		repository.findPublishedConnection.mockResolvedValue(
			mock<AgentIntegrationConfig>({ type: 'slack', credentialId: 'credential' }),
		);
		consumer.start();
		await checked.promise;
		consumer.stop();
		resume.resolve();
		await vi.waitFor(() => expect(release).toHaveBeenCalledOnce());
		expect(queue.recordFailure).not.toHaveBeenCalled();
	});

	it.each(['accepted', 'claim fails'] as const)(
		'releases the reserved bridge after the message is %s during handover',
		async (outcome) => {
			const item = claim('session', true);
			const bridge = mock<AgentChatBridge>();
			const release = vi.fn();
			const running = createDeferredPromise();
			repository.findThreadIds.mockResolvedValue(['session']);
			repository.findPublishedConnection.mockResolvedValue(
				mock<AgentIntegrationConfig>({ type: 'slack', credentialId: 'credential' }),
			);
			integrations.acquireQueueBridge.mockReturnValue({ bridge, release });
			bridge.consumeQueuedMessage.mockReturnValue(running.promise);
			queue.claimNext
				.mockImplementationOnce(async (_threadId, canConsume) => {
					expect(await canConsume(item.item, item.thread, {})).toBe(true);
					// Teardown now refuses new consumers. The admitted consumer keeps its bridge.
					integrations.acquireQueueBridge.mockReturnValue(undefined);
					integrations.getBridge.mockReturnValue(undefined);
					if (outcome === 'claim fails') throw new Error('Commit failed');
					return item;
				})
				.mockResolvedValue(null);
			consumer.start();
			try {
				if (outcome === 'accepted') {
					await vi.waitFor(() =>
						expect(bridge.consumeQueuedMessage).toHaveBeenCalledWith(
							item.item.payload,
							item.thread.id,
							item.admission,
							expect.any(AbortSignal),
							expect.objectContaining({ credentialId: 'credential' }),
						),
					);
					expect(release).not.toHaveBeenCalled();
				}
			} finally {
				running.resolve();
			}
			await vi.waitFor(() => expect(release).toHaveBeenCalledOnce());
			expect(queue.recordFailure).not.toHaveBeenCalled();
			if (outcome === 'claim fails') expect(bridge.consumeQueuedMessage).not.toHaveBeenCalled();
			else expect(queue.settle).toHaveBeenCalledWith(item.thread.id, item.admission.executionId);
		},
	);

	it('records a removed integration as a failure instead of leaving it pending', async () => {
		const item = claim('session', true);
		repository.findThreadIds.mockResolvedValue(['session']);
		queue.claimNext
			.mockImplementationOnce(async (_threadId, canConsume) => {
				expect(await canConsume(item.item, item.thread, {})).toBe(true);
				return item;
			})
			.mockResolvedValue(null);
		consumer.start();
		await vi.waitFor(() =>
			expect(queue.settle).toHaveBeenCalledWith('session', item.admission.executionId),
		);
		expect(queue.recordFailure).toHaveBeenCalledWith(
			item,
			expect.objectContaining({ message: 'The message integration is no longer configured' }),
			expect.any(AbortSignal),
		);
	});
});
