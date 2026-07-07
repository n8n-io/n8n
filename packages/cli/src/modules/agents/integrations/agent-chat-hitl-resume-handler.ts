import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { ActionEvent, Thread } from 'chat';
import type { Logger } from 'n8n-workflow';

import type { BridgeResumeExecutionContext, PlatformAgentContext } from './agent-chat-integration';
import type { AgentChatMessageContextBridge } from './agent-chat-message-context';
import type { AgentChatStreamConsumer } from './agent-chat-stream-consumer';
import type { CallbackStore } from './callback-store';
import type { InternalThread } from './types';

interface ResumeExecutor {
	resumeForChat(config: {
		agentId: string;
		projectId: string;
		runId: string;
		toolCallId: string;
		resumeData: unknown;
		integrationType?: string;
	}): AsyncGenerator<StreamChunk>;
}

interface AgentChatHitlResumeHandlerOptions {
	agentId: string;
	projectId: string;
	integration: AgentIntegrationConfig;
	agentService: ResumeExecutor;
	logger: Logger;
	callbackStore?: CallbackStore;
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

		const callbackData = await this.resolveCallbackData(event.actionId, event.value, thread);
		if (!callbackData) return;

		const parsed = this.parseActionId(callbackData.actionId, callbackData.value);
		if (!parsed) return;
		// Persist the interacting user / messageId into the thread's message
		// context so tools running on resume can read it via the message
		// context store — no need to bolt a duplicate copy onto resumeData.
		const platformThreadId = this.options.resolvePlatformThreadId(thread);
		const threadId = this.options.toAgentThreadId(platformThreadId);
		await this.options.messageContextBridge.updateLatest(threadId.id, event.user.userId, thread, {
			messageId: event.messageId,
			interactingUserId: event.user.userId,
			...this.options.getPlatformAgentContext(),
		});

		await this.cleanUpBeforeResume(event);
		await this.executeResume(thread, parsed.runId, parsed.toolCallId, parsed.resumeData);
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
	): Promise<{ actionId: string; value: string | undefined } | null> {
		if (!this.options.callbackStore) return { actionId, value };

		const resolved = await this.options.callbackStore.resolve(actionId);
		if (!resolved) {
			this.options.logger.warn('[AgentChatBridge] Callback key not found or expired', { actionId });
			await thread.post(
				'This action is no longer available. The link may have expired or already been used.',
			);
			return null;
		}
		return { actionId: resolved.actionId, value: resolved.value };
	}

	/**
	 * Delete the card message and apply platform-specific workarounds before
	 * resuming the agent.
	 */
	private async cleanUpBeforeResume(event: ActionEvent): Promise<void> {
		try {
			await event.adapter.deleteMessage(event.threadId, event.messageId);
		} catch (deleteError) {
			this.options.logger.warn('[AgentChatBridge] Failed to delete card message', {
				error: deleteError instanceof Error ? deleteError.message : String(deleteError),
			});
		}
	}

	/**
	 * Guard against double resumption, then resume the agent and stream the
	 * response back into the thread.
	 */
	private async executeResume(
		thread: Thread<unknown, unknown>,
		runId: string,
		toolCallId: string,
		resumeData: unknown,
	): Promise<void> {
		if (this.activeResumedRuns.has(runId)) {
			this.options.logger.warn('[AgentChatBridge] Run is already active', { runId, toolCallId });
			await thread.post('This action has already been handled');
			return;
		}

		this.activeResumedRuns.add(runId);
		try {
			const resumeExecutionContext = await this.options.createResumeExecutionContext(thread);
			const stream = this.options.agentService.resumeForChat({
				agentId: this.options.agentId,
				projectId: this.options.projectId,
				runId,
				toolCallId,
				resumeData,
				integrationType: this.options.integration.type,
			});
			await this.options.streamConsumer.consume(stream, thread, resumeExecutionContext);
		} finally {
			this.activeResumedRuns.delete(runId);
		}
	}
}
