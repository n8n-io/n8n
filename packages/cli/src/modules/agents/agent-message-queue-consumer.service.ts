import type { AgentSseEvent } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { OperationalError, UserError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { userHasScopes } from '@/permissions.ee/check-access';

import { AgentsCredentialProvider } from './adapters/agents-credential-provider';
import { AgentChatExecutionService } from './agent-chat-execution.service';
import { AgentExecutionService } from './agent-execution.service';
import { AgentMessageQueueService, type ClaimedAgentMessage } from './agent-message-queue.service';
import { AgentQueuedPreviewStreamService } from './agent-queued-preview-stream.service';
import { emitChunkEvents } from './agent-sse-stream';
import { AgentTestRunService } from './agent-test-run.service';
import type { AgentChatBridge } from './integrations/agent-chat-bridge';
import { ChatIntegrationService } from './integrations/chat-integration.service';
import { AgentMessageQueueRepository } from './repositories/agent-message-queue.repository';

@Service()
export class AgentMessageQueueConsumer {
	private readonly activeThreads = new Set<string>();
	private timer?: NodeJS.Timeout;
	private stopped = true;
	private scanning = false;

	constructor(
		private readonly queue: AgentMessageQueueService,
		private readonly repository: AgentMessageQueueRepository,
		private readonly executionService: AgentExecutionService,
		private readonly previewStreams: AgentQueuedPreviewStreamService,
		private readonly testRunService: AgentTestRunService,
		private readonly userRepository: UserRepository,
		private readonly credentialsService: CredentialsService,
		private readonly chatExecutionService: AgentChatExecutionService,
		private readonly integrations: ChatIntegrationService,
		private readonly logger: Logger,
	) {}

	start(): void {
		this.stopped = false;
		this.queue.onAvailable = (threadId) => this.kick(threadId);
		this.timer = setInterval(() => {
			void this.scan();
		}, 5_000);
		this.timer.unref();
		void this.scan();
	}

	@OnShutdown()
	stop(): void {
		this.stopped = true;
		clearInterval(this.timer);
		this.queue.onAvailable = undefined;
	}

	/** Find queued sessions after a missed notification, a restart, or acceptance on another main. */
	private async scan(): Promise<void> {
		if (this.stopped || this.scanning) return;
		this.scanning = true;
		try {
			for (const threadId of await this.repository.findThreadIds()) this.kick(threadId);
			await this.previewStreams.closeSettledStreams();
		} catch (error) {
			this.logger.warn('Failed to scan queued agent messages', { error });
		} finally {
			this.scanning = false;
		}
	}

	/** Start a local drain attempt. Database claims coordinate ownership across mains. */
	private kick(threadId: string): void {
		if (this.stopped || this.activeThreads.has(threadId)) return;
		this.activeThreads.add(threadId);
		void this.drain(threadId)
			.catch((error: unknown) => {
				this.logger.warn('Failed to consume queued agent messages', { threadId, error });
			})
			.finally(() => this.activeThreads.delete(threadId));
	}

	/** Run messages in FIFO order until the session is empty, blocked, or unavailable on this main. */
	private async drain(threadId: string): Promise<void> {
		while (!this.stopped) {
			if (!(await this.consumeNext(threadId))) return;
		}
	}

	/** Claim and process one message. A bridge lease prevents teardown until the attempt finishes. */
	private async consumeNext(threadId: string): Promise<boolean> {
		let lease: ReturnType<ChatIntegrationService['acquireQueueBridge']>;
		try {
			const claim = await this.queue.claimNext(threadId, async (item, thread, ctx) => {
				if (this.stopped) return false;
				if (item.payload.kind === 'preview') return true;
				const connection = await this.repository.findPublishedConnection(
					thread.agentId,
					thread.projectId,
					item.source,
					item.payload.credentialId,
					ctx,
				);
				if (this.stopped) return false;
				// Removed connections fail the item. A missing or closing bridge leaves it pending.
				if (!connection) return true;
				lease = this.integrations.acquireQueueBridge(
					thread.agentId,
					item.source,
					item.payload.credentialId,
				);
				return lease !== undefined;
			});
			if (!claim) return false;
			await this.consume(claim, lease?.bridge);
			return true;
		} finally {
			lease?.release();
		}
	}

	/** Execute a claimed message, deliver its output, and settle its queue item. */
	private async consume(claim: ClaimedAgentMessage, bridge?: AgentChatBridge): Promise<void> {
		const { item, thread, admission } = claim;
		const controller = new AbortController();
		const signal = AbortSignal.any([
			controller.signal,
			this.executionService.getAbortSignal(admission.executionId),
		]);
		const sender =
			item.payload.kind === 'preview' ? this.previewStreams.createSender(item.id) : undefined;
		try {
			if (item.payload.kind === 'preview' && sender) {
				this.chatExecutionService.register(
					{
						projectId: thread.projectId,
						agentId: thread.agentId,
						threadId: thread.id,
						userId: item.payload.userId,
						executionId: admission.executionId,
					},
					controller,
				);
				sender.send({
					type: 'execution-started',
					executionId: admission.executionId,
					sessionId: thread.id,
					message: item.payload.message,
				});
				await this.chatExecutionService.settle(
					admission.executionId,
					async () => await this.consumePreview(claim, signal, sender.send),
				);
			} else {
				await this.consumeIntegration(claim, signal, bridge);
			}
		} catch (error) {
			await this.queue.recordFailure(claim, error, controller.signal);
			sender?.send({
				type: 'error',
				message: error instanceof Error ? error.message : 'Chat failed',
			});
			this.logger.warn('Queued agent message failed', {
				queueId: item.id,
				executionId: admission.executionId,
				error,
			});
		} finally {
			await sender?.close();
			await this.queue.settle(thread.id, admission.executionId);
		}
	}

	private async consumePreview(
		claim: ClaimedAgentMessage,
		signal: AbortSignal,
		send: (event: AgentSseEvent) => void,
	): Promise<void> {
		const { item, thread, admission } = claim;
		if (item.payload.kind !== 'preview') return;
		const user = await this.userRepository.findByIdWithRole(item.payload.userId);
		if (
			!user ||
			user.disabled ||
			!(await userHasScopes(user, ['agent:execute'], false, { projectId: thread.projectId }))
		) {
			throw new UserError('You can no longer execute this agent');
		}
		signal.throwIfAborted();
		const prepared = await this.testRunService.prepareDraftRun({
			agentId: thread.agentId,
			projectId: thread.projectId,
			user,
			sessionId: thread.id,
			previewChat: true,
			newSession: false,
			credentialProvider: new AgentsCredentialProvider(
				this.credentialsService,
				thread.projectId,
				user,
				thread.agentId,
			),
		});
		if (prepared.status !== 'ready') {
			const message =
				prepared.status === 'agent_misconfigured'
					? 'This agent is not ready to run yet.'
					: 'Session not found';
			await this.queue.recordFailure(claim, new UserError(message), signal);
			send({
				type: 'error',
				message,
				...(prepared.status === 'agent_misconfigured'
					? { errorCode: 'agent_misconfigured', missing: prepared.missing }
					: {}),
			});
			return;
		}
		const result = await this.testRunService.executePreparedDraftRun({
			agentId: thread.agentId,
			projectId: thread.projectId,
			user,
			message: item.payload.message,
			attachments: item.payload.attachments,
			sessionId: thread.id,
			sessionMode: 'existing',
			previewChat: true,
			source: item.source,
			admittedExecution: admission,
			abortSignal: signal,
			errorMode: 'forward',
			onChunk: (chunk) => emitChunkEvents(chunk, send),
		});
		if (result.status === 'completed')
			send({ type: 'done', sessionId: thread.id, executionId: admission.executionId });
	}

	private async consumeIntegration(
		claim: ClaimedAgentMessage,
		signal: AbortSignal,
		bridge?: AgentChatBridge,
	): Promise<void> {
		const { item, thread } = claim;
		if (item.payload.kind !== 'integration') return;
		const connection = await this.repository.findPublishedConnection(
			thread.agentId,
			thread.projectId,
			item.source,
			item.payload.credentialId,
		);
		if (!connection) throw new UserError('The message integration is no longer configured');
		if (!bridge) throw new OperationalError('The message integration is unavailable');
		await bridge.consumeQueuedMessage(item.payload, thread.id, claim.admission, signal, connection);
	}
}
