import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { ActionEvent, Author, Thread } from 'chat';
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
import type { InternalThread } from './types';
import type {
	ResumeForChatConfig,
	AgentExecutionOrchestratorService,
} from '../agent-execution-orchestrator.service';

type ResumeExecutor = Pick<AgentExecutionOrchestratorService, 'resumeForChat'> & {
	/**
	 * Whether the parked run is still resumable. Optional so a caller that
	 * cannot look checkpoints up (tests) simply skips the gate.
	 */
	isResumable?(config: { agentId: string; runId: string }): Promise<boolean>;
};

/**
 * Sent when a card is answered but its run is no longer there to resume: an
 * expired callback key, or a checkpoint that expired or was already resolved.
 */
const STALE_ACTION_NOTICE =
	'This action is no longer available. The link may have expired or already been used.';

/**
 * Answer one person's card click where only they can see it. Slack and Teams
 * post it natively; the SDK returns `null` for an adapter that cannot, and the
 * notice falls back to the thread rather than being dropped.
 *
 * `fallbackToDM: false` is deliberate — the SDK's DM fallback would turn an
 * in-channel notice into an unsolicited direct message on Discord and Telegram.
 */
async function postPrivateNotice(
	thread: Thread<unknown, unknown>,
	user: Author,
	text: string,
): Promise<void> {
	const sent = await thread.postEphemeral(user, text, { fallbackToDM: false });
	if (!sent) await thread.post(text);
}


interface AgentChatHitlResumeHandlerOptions {
	agentId: string;
	projectId: string;
	integration: AgentIntegrationConfig;
	agentService: ResumeExecutor;
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
	/** Short-lived set of run IDs that have been resumed to prevent double resumption */
	private readonly activeResumedRuns = new Set<string>();

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

		const callbackData = await this.resolveCallbackData(
			event.actionId,
			event.value,
			thread,
			event.user,
		);
		if (!callbackData) return;

		const parsed = this.parseActionId(callbackData.actionId, callbackData.value);
		if (!parsed) return;

		// A card whose run is gone cannot be resumed, and resuming anyway reports
		// it as an agent misconfiguration — which it is not. Check before the card
		// is settled, so a stale card is never relabelled with a decision that
		// never took effect. Teams cards are the common case: a targeted card
		// cannot be edited, so its buttons stay live after the run finishes.
		if (!(await this.isRunResumable(parsed.runId))) {
			await postPrivateNotice(thread, event.user, STALE_ACTION_NOTICE);
			return;
		}
		// Persist the interacting user / messageId into the thread's message
		// context so tools running on resume can read it via the message
		// context store — no need to bolt a duplicate copy onto resumeData.
		const platformThreadId = this.options.resolvePlatformThreadId(thread);
		const threadId = this.options.toAgentThreadId(platformThreadId);
		const messageContext = this.options.messageContextBridge.capture(thread, {
			messageId: event.messageId,
			interactingUserId: event.user.userId,
			...this.options.getPlatformAgentContext(),
			replyExpectation: 'required',
		});

		await this.cleanUpBeforeResume(event, parsed.resumeData, callbackData);
		await this.executeResume(thread, parsed.runId, parsed.toolCallId, parsed.resumeData, {
			messageContext,
			contextConversation: { threadId: threadId.id, resourceId: event.user.userId },
			actingUser: event.user,
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
		user: Author,
	): Promise<{
		actionId: string;
		value: string | undefined;
		label?: string;
	} | null> {
		if (!this.options.callbackStore) return { actionId, value };

		const resolved = await this.options.callbackStore.resolve(actionId);
		if (!resolved) {
			this.options.logger.warn('[AgentChatBridge] Callback key not found or expired', { actionId });
			await postPrivateNotice(thread, user, STALE_ACTION_NOTICE);
			return null;
		}
		return {
			actionId: resolved.actionId,
			value: resolved.value,
			label: resolved.label,
		};
	}

	/** Clean up the action message according to integration policy before resuming. */
	private async cleanUpBeforeResume(
		event: ActionEvent,
		resumeData: unknown,
		callbackData: { label?: string },
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
			// Read the decision off the payload, not off store metadata: the button
			// value already carries `{ approved }` whenever the tool's resume schema
			// declares it, so platforms without a CallbackStore get it too.
			const approved = this.getApprovalDecision(resumeData);
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

	private async isRunResumable(runId: string): Promise<boolean> {
		if (!this.options.agentService.isResumable) return true;
		try {
			return await this.options.agentService.isResumable({
				agentId: this.options.agentId,
				runId,
			});
		} catch (error) {
			// A failed lookup must not swallow the click: let the resume decide.
			this.options.logger.warn('[AgentChatBridge] Could not check whether a run is resumable', {
				runId,
				error: error instanceof Error ? error.message : String(error),
			});
			return true;
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

	/**
	 * Guard against double resumption, then resume the agent and stream the
	 * response back into the thread.
	 *
	 * Public because a resume is not always user-driven — `AgentChatBridge` also
	 * calls this when a sub-workflow finishing wakes a suspended run. Note the
	 * `activeResumedRuns` guard is per instance, so it only covers this process.
	 */
	async executeResume(
		thread: Thread<unknown, unknown>,
		runId: string,
		toolCallId: string,
		resumeData: unknown,
		options: Pick<ResumeForChatConfig, 'messageContext' | 'contextConversation'> & {
			/**
			 * The user who clicked, when there is one. They are told privately that
			 * the action was already handled, and a card the resumed turn raises is
			 * addressed to them. A resume the user did not trigger (a sub-workflow
			 * waking the run) omits it and stays silent.
			 */
			actingUser?: Author;
		} = {},
	): Promise<void> {
		const { actingUser, ...context } = options;
		if (this.activeResumedRuns.has(runId)) {
			this.options.logger.warn('[AgentChatBridge] Run is already active', { runId, toolCallId });
			if (actingUser) {
				await postPrivateNotice(thread, actingUser, 'This action has already been handled');
			}
			return;
		}

		this.activeResumedRuns.add(runId);
		try {
			const resumeExecutionContext = await this.options.createResumeExecutionContext(thread);
			const statusHandle = onceStatusHandle(resumeExecutionContext.statusHandle);
			try {
				const stream = this.options.agentService.resumeForChat({
					...context,
					agentId: this.options.agentId,
					projectId: this.options.projectId,
					runId,
					toolCallId,
					resumeData,
					integrationType: this.options.integration.type,
				});
				await this.options.streamConsumer.consume(stream, thread, {
					...resumeExecutionContext,
					statusHandle,
					...(actingUser ? { actingUserId: actingUser.userId } : {}),
				});
			} finally {
				// The stream consumer clears the status right before the first response;
				// this clear covers failures before/outside consumption. The
				// once-wrapped handle makes it a no-op await when that already ran.
				await statusHandle?.clearBeforeResponse();
			}
		} finally {
			this.activeResumedRuns.delete(runId);
		}
	}
}
