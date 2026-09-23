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
import type { InternalThread } from './types';
import type {
	ResumeForChatConfig,
	AgentExecutionOrchestratorService,
} from '../agent-execution-orchestrator.service';
import { AgentResumeAlreadyHandledError } from '../agent-resume-already-handled.error';
import { INTERACTIVE_RESUME_SESSION_WAIT_MS } from '../agent-session-lease.service';
import { AgentTurnAlreadyRunningError } from '../agent-turn-already-running.error';

type ResumeExecutor = Pick<AgentExecutionOrchestratorService, 'resumeForChat'>;

type ResumeContext = Pick<
	ResumeForChatConfig,
	'messageContext' | 'contextConversation' | 'sessionWaitMs'
>;

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
	// TODO(AGENT-1031): Remove with the message queue flag.
	/** Without the flag, the turn takes no session lease, so the handler guards resumes itself. */
	messageQueueEnabled: boolean;
}

export class AgentChatHitlResumeHandler {
	// TODO(AGENT-1031): Remove with the message queue flag. The session lease replaces this guard.
	/** Run IDs this process resumes. Without the message queue flag, it keeps out a second resume. */
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

		const callbackData = await this.resolveCallbackData(event.actionId, event.value, thread);
		if (!callbackData) return;

		const parsed = this.parseActionId(callbackData.actionId, callbackData.value);
		if (!parsed) return;
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
			sessionWaitMs: INTERACTIVE_RESUME_SESSION_WAIT_MS,
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

		const resolved = await this.options.callbackStore.resolve(actionId);
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

	/** Clean up the action message according to integration policy before resuming. */
	private async cleanUpBeforeResume(
		event: ActionEvent,
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

	/**
	 * Resumes the agent and streams the response back into the thread. The
	 * session lease keeps a second resume out, and each start attempt rejects a
	 * resume that another one already handled.
	 *
	 * Public because a resume is not always user-driven — `AgentChatBridge` also
	 * calls this when a sub-workflow finishing wakes a suspended run. That caller
	 * sets `notifyOnDuplicate: false` and gets the busy or handled error back.
	 */
	async executeResume(
		thread: Thread<unknown, unknown>,
		runId: string,
		toolCallId: string,
		resumeData: unknown,
		options: ResumeContext & { notifyOnDuplicate?: boolean } = {},
	): Promise<void> {
		if (!this.options.messageQueueEnabled) {
			return await this.executeResumeOncePerProcess(thread, runId, toolCallId, resumeData, options);
		}
		const { notifyOnDuplicate = true, ...context } = options;
		try {
			await this.streamResume(thread, runId, toolCallId, resumeData, context);
		} catch (error) {
			if (!notifyOnDuplicate || !isDuplicateResume(error)) throw error;
			this.options.logger.warn('[AgentChatBridge] Run is already handled', { runId, toolCallId });
			await thread.post('This action has already been handled');
		}
	}

	// TODO(AGENT-1031): Remove with the message queue flag. The session lease replaces this guard.
	/** Without the session lease, a guard in this process keeps a second resume of a run out. */
	private async executeResumeOncePerProcess(
		thread: Thread<unknown, unknown>,
		runId: string,
		toolCallId: string,
		resumeData: unknown,
		options: ResumeContext & { notifyOnDuplicate?: boolean },
	): Promise<void> {
		const { notifyOnDuplicate = true, ...context } = options;
		if (this.activeResumedRuns.has(runId)) {
			this.options.logger.warn('[AgentChatBridge] Run is already active', { runId, toolCallId });
			if (notifyOnDuplicate) await thread.post('This action has already been handled');
			return;
		}
		this.activeResumedRuns.add(runId);
		try {
			await this.streamResume(thread, runId, toolCallId, resumeData, context);
		} finally {
			this.activeResumedRuns.delete(runId);
		}
	}

	private async streamResume(
		thread: Thread<unknown, unknown>,
		runId: string,
		toolCallId: string,
		resumeData: unknown,
		context: ResumeContext,
	): Promise<void> {
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
			});
		} finally {
			// The stream consumer clears the status right before the first response;
			// this clear covers failures before/outside consumption. The
			// once-wrapped handle makes it a no-op await when that already ran.
			await statusHandle?.clearBeforeResponse();
		}
	}
}

/**
 * A second click on the same card: the first resume still holds the session
 * after the wait, or it already handled the checkpoint.
 */
function isDuplicateResume(error: unknown): boolean {
	return (
		error instanceof AgentTurnAlreadyRunningError || error instanceof AgentResumeAlreadyHandledError
	);
}
