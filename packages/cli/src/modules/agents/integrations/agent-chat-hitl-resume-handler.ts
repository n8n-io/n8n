import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { ActionEvent, Message, Thread } from 'chat';
import type { Logger } from 'n8n-workflow';

import type { ResumeForChatConfig } from '../agent-execution-orchestrator.service';
import {
	AgentThreadBusyError,
	type AgentTurnQueueService,
	type AgentTurnClaim,
} from '../agent-turn-queue.service';
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
import type { InternalThread } from './types';

/** What a channel resume tells the orchestrator; the runtime comes from the published agent. */
export type ChannelResumeConfig = Pick<
	ResumeForChatConfig,
	| 'agentId'
	| 'projectId'
	| 'runId'
	| 'toolCallId'
	| 'resumeData'
	| 'integrationType'
	| 'beforeResume'
>;

interface PendingChannelAction {
	actionId: string;
	kind?: 'approval';
	label?: string;
}

interface ResumeExecutor {
	resolveResumeThread(config: ChannelResumeConfig): Promise<string>;
	resumeForChat(config: ChannelResumeConfig, claim: AgentTurnClaim): AsyncGenerator<StreamChunk>;
}

interface AgentChatHitlResumeHandlerOptions {
	agentId: string;
	projectId: string;
	integration: AgentIntegrationConfig;
	agentService: ResumeExecutor;
	turnQueueService: Pick<AgentTurnQueueService, 'tryRunNow'>;
	logger: Logger;
	callbackStore?: CallbackStore;
	deleteActionMessageBeforeResume: boolean;
	formatActionDecisionMessage?: ActionDecisionMessageFormatter;
	settleActionMessage?: SettleActionMessage;
	resolvePlatformThreadId: (thread: Thread<unknown, unknown>) => string;
	toAgentThreadId: (platformThreadId: string) => InternalThread;
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

		const callbackData = await this.resolveCallbackData(event.actionId, event.value, thread);
		if (!callbackData) return;

		const parsed = this.parseActionId(callbackData.actionId, callbackData.value);
		if (!parsed) return;
		const action: PendingChannelAction = {
			actionId: event.actionId,
			...(callbackData.kind !== undefined ? { kind: callbackData.kind } : {}),
			...(callbackData.label !== undefined ? { label: callbackData.label } : {}),
		};
		await this.executeResume(thread, parsed.runId, parsed.toolCallId, parsed.resumeData, {
			// Runs only once the resume owns the thread turn.
			beforeResume: async (abortSignal) =>
				await this.runActionBeforeResume(
					thread,
					action,
					{ id: event.messageId, author: event.user, raw: event.raw },
					parsed.resumeData,
					{ adapter: event.adapter, threadId: event.threadId },
					abortSignal,
				),
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

	/**
	 * Resolve short callback keys when the platform uses them (e.g. Telegram).
	 * Returns the resolved `{ actionId, value }` or `null` if expired/missing.
	 */
	private async resolveCallbackData(
		actionId: string,
		value: string | undefined,
		thread: Thread<unknown, unknown>,
	): Promise<{
		actionId: string;
		value: string | undefined;
		kind?: 'approval';
		label?: string;
	} | null> {
		if (!this.options.callbackStore) return { actionId, value };

		const resolved = await this.options.callbackStore.peek(actionId);
		if (!resolved) {
			this.options.logger.warn('[AgentChatBridge] Callback key not found or expired', { actionId });
			await thread.post(
				'This action is no longer available. The link may have expired or already been used.',
			);
			return null;
		}
		return {
			actionId: resolved.actionId,
			value: resolved.value,
			kind: resolved.kind,
			label: resolved.label,
		};
	}

	/** Run action side effects after the resume owns the thread turn. */
	async runActionBeforeResume(
		thread: Thread<unknown, unknown>,
		action: PendingChannelAction,
		message: Pick<Message<unknown>, 'id' | 'author' | 'raw'>,
		resumeData: unknown,
		target: Pick<ActionEvent, 'adapter' | 'threadId'> = {
			adapter: thread.adapter,
			threadId: thread.id,
		},
		abortSignal?: AbortSignal,
	): Promise<void> {
		abortSignal?.throwIfAborted();
		let callbackData: { kind?: 'approval'; label?: string } = action;
		if (this.options.callbackStore) {
			const resolved = await this.options.callbackStore.resolve(action.actionId);
			if (resolved) callbackData = resolved;
		}
		abortSignal?.throwIfAborted();

		const platformThreadId = this.options.resolvePlatformThreadId(thread);
		const threadId = this.options.toAgentThreadId(platformThreadId);
		// Persist the interacting user / messageId into the thread's message
		// context so tools running on resume can read it via the message
		// context store — no need to bolt a duplicate copy onto resumeData.
		abortSignal?.throwIfAborted();
		await this.options.messageContextBridge.updateLatest(
			threadId.id,
			message.author.userId,
			thread,
			{
				messageId: message.id,
				interactingUserId: message.author.userId,
				...this.options.getPlatformAgentContext(),
				// The resume response streams back to this thread like any chat turn,
				// so the same reply-delivery rules apply.
				replyExpectation: 'required',
			},
		);
		abortSignal?.throwIfAborted();
		await this.cleanUpBeforeResume(target, message, resumeData, callbackData, abortSignal);
		abortSignal?.throwIfAborted();
	}

	/** Clean up the action message according to integration policy before resuming. */
	private async cleanUpBeforeResume(
		target: Pick<ActionEvent, 'adapter' | 'threadId'>,
		message: Pick<Message<unknown>, 'id' | 'author' | 'raw'>,
		resumeData: unknown,
		callbackData: { kind?: 'approval'; label?: string },
		abortSignal?: AbortSignal,
	): Promise<void> {
		abortSignal?.throwIfAborted();
		if (this.options.deleteActionMessageBeforeResume) {
			try {
				await target.adapter.deleteMessage(target.threadId, message.id);
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
			const content = this.options.formatActionDecisionMessage?.({
				...(approved !== undefined ? { approved } : {}),
				...(callbackData.label !== undefined ? { selectedLabel: callbackData.label } : {}),
				raw: message.raw,
				user: message.author,
			});
			if (!content) return;

			abortSignal?.throwIfAborted();
			if (this.options.settleActionMessage) {
				await this.options.settleActionMessage({
					agentId: this.options.agentId,
					integration: this.options.integration,
					threadId: target.threadId,
					messageId: message.id,
					content,
				});
			} else {
				await target.adapter.editMessage(target.threadId, message.id, content);
			}
		} catch (editError) {
			abortSignal?.throwIfAborted();
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

	/** Claim the thread, then resume and stream the response back into it. */
	async executeResume(
		thread: Thread<unknown, unknown>,
		runId: string,
		toolCallId: string,
		resumeData: unknown,
		{
			beforeResume,
		}: {
			/** Side effects that belong to the claimed resume; see `ResumeForChatConfig`. */
			beforeResume?: (abortSignal: AbortSignal) => Promise<void>;
		} = {},
	): Promise<void> {
		const { agentId, projectId, integration } = this.options;
		const config: ChannelResumeConfig = {
			agentId,
			projectId,
			runId,
			toolCallId,
			resumeData,
			integrationType: integration.type,
			beforeResume,
		};
		const threadId = await this.options.agentService.resolveResumeThread(config);
		const claim = await this.options.turnQueueService.tryRunNow({
			threadId,
			agentId,
			projectId,
			userMessage: null,
			source: integration.type,
			runContext: { kind: 'resume', runId, toolCallId, resumeData },
		});
		if (!claim) throw new AgentThreadBusyError();
		await this.runResume(thread, config, claim);
	}

	/** Stream the claimed resume into `thread`. A failure before the run started ends the row. */
	async runResume(
		thread: Thread<unknown, unknown>,
		config: ChannelResumeConfig,
		claim: AgentTurnClaim,
	): Promise<void> {
		let statusHandle: ReturnType<typeof onceStatusHandle> | undefined;
		try {
			claim.abortSignal.throwIfAborted();
			const resumeExecutionContext = await this.options.createResumeExecutionContext(thread);
			statusHandle = onceStatusHandle(resumeExecutionContext.statusHandle);
			claim.abortSignal.throwIfAborted();
			const stream = this.options.agentService.resumeForChat(config, claim);
			await this.options.streamConsumer.consume(stream, thread, {
				...resumeExecutionContext,
				statusHandle,
			});
		} catch (error) {
			await claim.fail(error);
			throw error;
		} finally {
			// The stream consumer clears the status right before the first response;
			// this clear covers failures before/outside consumption. The
			// once-wrapped handle makes it a no-op await when that already ran.
			await statusHandle?.clearBeforeResponse();
		}
	}
}
