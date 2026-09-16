import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { ActionEvent, Thread } from 'chat';
import type { Logger } from 'n8n-workflow';

import type {
	ActionDecisionMessageFormatter,
	BridgeResumeExecutionContext,
	PlatformAgentContext,
	SettleActionMessage,
} from './agent-chat-integration';
import { onceStatusHandle } from './agent-chat-integration';
import type { AgentChatMessageContextBridge } from './agent-chat-message-context';
import type { AgentChatStreamConsumer } from './agent-chat-stream-consumer';
import type { CallbackStore } from './callback-store';
import type { AgentMessageQueueService } from '../agent-message-queue.service';
import type {
	IntegrationResumeQueuePayload,
	QueueExecutionContext,
} from '../agent-message-queue.types';
import type { ResumeForChatConfig } from '../agent-execution-orchestrator.service';
import { UserError } from 'n8n-workflow';

interface ResumeExecutor {
	resumeForChat(config: ResumeForChatConfig): AsyncGenerator<StreamChunk>;
}

interface AgentChatHitlResumeHandlerOptions {
	messageQueue: AgentMessageQueueService;
	agentId: string;
	projectId: string;
	integration: AgentIntegrationConfig;
	agentService: ResumeExecutor;
	logger: Logger;
	callbackStore?: CallbackStore;
	deleteActionMessageBeforeResume: boolean;
	formatActionDecisionMessage?: ActionDecisionMessageFormatter;
	settleActionMessage?: SettleActionMessage;
	getPlatformAgentContext: () => PlatformAgentContext;
	messageContextBridge: AgentChatMessageContextBridge;
	streamConsumer: AgentChatStreamConsumer;
	createResumeExecutionContext: (
		thread: Thread<unknown, unknown>,
	) => Promise<BridgeResumeExecutionContext>;
}

export class AgentChatHitlResumeHandler {
	constructor(private readonly options: AgentChatHitlResumeHandlerOptions) {}

	/**
	 * Handle a button/select action. Action IDs use one of two prefixes:
	 * - `ri-sel:{selectId}:{runId}:{toolCallId}` — interactive card select
	 * - `resume:{runId}:{toolCallId}:{index}` — generic per-tool resume button
	 */
	async handleAction(event: ActionEvent): Promise<void> {
		const { thread } = event;

		if (!thread) {
			this.options.logger.warn('[AgentChatBridge] Thread is not set for event', {
				threadId: event.threadId,
				actionId: event.actionId,
			});
			return;
		}

		const persist = async (callbackData: {
			actionId: string;
			value?: string;
			kind?: 'approval';
			label?: string;
		}) => {
			const parsed = this.parseActionId(callbackData.actionId, callbackData.value);
			if (!parsed) throw new UserError('This action is not available');
			const memory = await this.options.messageQueue.getResumeScope(
				this.options.agentId,
				parsed.runId,
			);
			await this.options.messageQueue.enqueue({
				agentId: this.options.agentId,
				threadId: memory.threadId,
				payload: {
					source: 'integration',
					kind: 'hitl',
					projectId: this.options.projectId,
					resourceId: memory.resourceId,
					integrationType: this.options.integration.type,
					credentialId: this.options.integration.credentialId,
					thread: thread.toJSON(),
					...parsed,
					action: {
						messageId: event.messageId,
						user: event.user,
						raw: event.raw,
						callbackData: { kind: callbackData.kind, label: callbackData.label },
					},
				},
			});
		};
		if (this.options.callbackStore) {
			const resolved = await this.options.callbackStore.resolve(event.actionId, persist);
			if (!resolved)
				await thread.post(
					'This action is no longer available. The link may have expired or already been used.',
				);
		} else {
			await persist({ actionId: event.actionId, value: event.value });
		}
	}

	async processQueuedResponse(
		payload: IntegrationResumeQueuePayload,
		thread: Thread,
		threadId: string,
		context: QueueExecutionContext,
	): Promise<void> {
		const memory = await this.options.messageQueue.getResumeScope(
			this.options.agentId,
			payload.runId,
		);
		if (memory.threadId !== threadId || memory.resourceId !== payload.resourceId) {
			throw new UserError(`Checkpoint ${payload.runId} does not belong to this chat`);
		}
		await this.executeResume(thread, payload.runId, payload.toolCallId, payload.resumeData, {
			...context,
			expectedMemory: memory,
			onResumeClaimed: async () => {
				await this.options.messageContextBridge.updateLatest(threadId, payload.resourceId, thread, {
					messageId: payload.action.messageId,
					interactingUserId: payload.action.user.userId,
					...this.options.getPlatformAgentContext(),
					replyExpectation: 'required',
				});
				await this.cleanUpBeforeResume(
					{
						adapter: thread.adapter,
						threadId: thread.id,
						...payload.action,
					},
					payload.resumeData,
					payload.action.callbackData,
				);
			},
		});
	}

	/** Parsed result from an action ID. */
	private parseActionId(
		actionId: string,
		value: string | undefined,
	): { runId: string; toolCallId: string; resumeData: unknown } | null {
		if (actionId.startsWith('ri-sel:')) {
			const parts = actionId.split(':');
			if (parts.length < 4) {
				this.options.logger.warn('[AgentChatBridge] Malformed ri-sel action ID', { actionId });
				return null;
			}
			return {
				runId: parts[2],
				toolCallId: parts.slice(3).join(':'),
				resumeData: { type: 'select', id: parts[1], value },
			};
		}

		if (actionId.startsWith('resume:')) {
			const parts = actionId.split(':');
			if (parts.length < 4) {
				this.options.logger.warn('[AgentChatBridge] Malformed action ID', { actionId });
				return null;
			}
			let resumeData: unknown;
			try {
				resumeData = JSON.parse(value ?? '');
			} catch {
				resumeData = { value };
			}
			return { runId: parts[1], toolCallId: parts.slice(2, -1).join(':'), resumeData };
		}

		return null;
	}

	/** Clean up the action message according to integration policy before resuming. */
	private async cleanUpBeforeResume(
		event: Pick<ActionEvent, 'adapter' | 'threadId' | 'messageId' | 'raw' | 'user'>,
		resumeData: unknown,
		callbackData: { kind?: 'approval'; label?: string },
	): Promise<void> {
		if (this.options.deleteActionMessageBeforeResume) {
			try {
				await event.adapter.deleteMessage(event.threadId, event.messageId);
			} catch (deleteError) {
				this.options.logger.warn('[AgentChatBridge] Failed to delete card message', {
					error: deleteError instanceof Error ? deleteError.message : String(deleteError),
				});
			}
			return;
		}

		try {
			const approved =
				callbackData.kind === 'approval' ? this.getApprovalDecision(resumeData) : undefined;
			const message = this.options.formatActionDecisionMessage?.({
				...(approved !== undefined ? { approved } : {}),
				...(callbackData.label !== undefined ? { selectedLabel: callbackData.label } : {}),
				raw: event.raw,
				user: event.user,
			});
			if (!message) return;

			if (this.options.settleActionMessage) {
				await this.options.settleActionMessage({
					agentId: this.options.agentId,
					integration: this.options.integration,
					threadId: event.threadId,
					messageId: event.messageId,
					content: message,
				});
			} else {
				await event.adapter.editMessage(event.threadId, event.messageId, message);
			}
		} catch (editError) {
			this.options.logger.warn('[AgentChatBridge] Failed to settle action card', {
				error: editError instanceof Error ? editError.message : String(editError),
			});
		}
	}

	private getApprovalDecision(resumeData: unknown): boolean | undefined {
		if (
			typeof resumeData !== 'object' ||
			resumeData === null ||
			!('approved' in resumeData) ||
			typeof resumeData.approved !== 'boolean'
		) {
			return undefined;
		}
		return resumeData.approved;
	}

	/** Callers hold the conversation lock. Checkpoint claims reject duplicate responses. */
	async executeResume(
		thread: Thread<unknown, unknown>,
		runId: string,
		toolCallId: string,
		resumeData: unknown,
		execution: Pick<
			ResumeForChatConfig,
			'abortSignal' | 'onExecutionStarted' | 'expectedMemory' | 'onResumeClaimed'
		> = {},
	): Promise<void> {
		const resumeExecutionContext = await this.options.createResumeExecutionContext(thread);
		const statusHandle = onceStatusHandle(resumeExecutionContext.statusHandle);
		try {
			const stream = this.options.agentService.resumeForChat({
				agentId: this.options.agentId,
				projectId: this.options.projectId,
				runId,
				toolCallId,
				resumeData,
				integrationType: this.options.integration.type,
				...execution,
			});
			await this.options.streamConsumer.consume(stream, thread, {
				...resumeExecutionContext,
				statusHandle,
			});
		} finally {
			await statusHandle?.clearBeforeResponse();
		}
	}
}
