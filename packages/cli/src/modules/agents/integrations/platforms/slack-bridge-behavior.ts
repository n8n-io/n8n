import { isRecord } from '@n8n/utils/is-record';
import type { Thread } from 'chat';

import type {
	BridgeExecutionContext,
	BridgeMessageContextParams,
	BridgeResumeExecutionContext,
	BridgeStatusHandle,
	PlatformAgentContext,
} from '../agent-chat-integration';
import type { ChatInstance } from '../chat-integration.service';

const SLACK_THINKING_STATUS = 'Thinking...';
const SLACK_STATUS_RETRY_DELAY_MS = 750;

interface SlackThreadContext {
	channelId: string;
	threadTs: string;
	hasRealThreadTs: boolean;
}

interface SlackAssistantStatusAdapter {
	setAssistantStatus(
		channelId: string,
		threadTs: string,
		status: string,
		loadingMessages?: string[],
	): Promise<void>;
}

export function getSlackPlatformAgentContext(chat: ChatInstance): PlatformAgentContext {
	const adapter = chat.getAdapter('slack');
	if (!isRecord(adapter)) return {};
	const agentUserId = stringValue(adapter.botUserId);
	return agentUserId ? { agentUserId } : {};
}

export function prepareSlackInboundText(text: string, context: PlatformAgentContext): string {
	const trimmed = text.trim();
	if (!context.agentUserId) return trimmed;
	return stripSlackSelfMention(trimmed, context.agentUserId);
}

export async function createSlackBridgeExecutionContext(
	params: BridgeMessageContextParams,
): Promise<BridgeExecutionContext> {
	const platformAgentContext = getSlackPlatformAgentContext(params.chat);
	const slackThreadContext = getSlackThreadContext(params.message);
	const statusHandle = await startSlackThinkingStatus(params.thread, {
		chat: params.chat,
		logger: params.logger,
		agentId: params.agentId,
		slackThreadContext,
		statusRetry: params.statusRetry,
	});

	return {
		platformAgentContext,
		forceBuffered: slackThreadContext?.hasRealThreadTs !== true,
		statusHandle,
	};
}

export async function createSlackResumeExecutionContext(params: {
	chat: ChatInstance;
	thread: Thread<unknown, unknown>;
	logger: BridgeMessageContextParams['logger'];
	agentId: string;
}): Promise<BridgeResumeExecutionContext> {
	// Slack action payloads do not reliably include the original message's raw
	// thread_ts, so resume responses use the same safe buffered path as top-level
	// messages without a materialized Slack thread.
	return {
		forceBuffered: true,
		statusHandle: await startSlackThinkingStatus(params.thread, {
			chat: params.chat,
			logger: params.logger,
			agentId: params.agentId,
		}),
	};
}

async function startSlackThinkingStatus(
	thread: Thread<unknown, unknown>,
	options: {
		chat: ChatInstance;
		logger: BridgeMessageContextParams['logger'];
		agentId: string;
		slackThreadContext?: SlackThreadContext;
		statusRetry?: AbortController;
	},
): Promise<BridgeStatusHandle | undefined> {
	const { slackThreadContext, statusRetry } = options;

	if (slackThreadContext && !slackThreadContext.hasRealThreadTs) {
		const setStatus = setSlackAssistantStatus(slackThreadContext, options);
		return {
			clearBeforeResponse: async () => {
				// Cancel any pending status retry first: the retry waits out a
				// delay before re-setting "Thinking...", and without this it could
				// fire *after* we clear and leave a stale status behind.
				statusRetry?.abort();
				// Then wait for the set to settle. Aborting only cancels the
				// retry's local wait — an *in-flight* "Thinking..." write can't
				// be recalled, so we must let it land before we clear, otherwise
				// its remote write could overwrite the clear and restore the
				// stale status. (setStatus never rejects — it logs internally.)
				await setStatus;
				await clearSlackAssistantStatus(slackThreadContext, options);
			},
		};
	}

	try {
		await thread.startTyping(SLACK_THINKING_STATUS);
	} catch (error) {
		options.logger.warn('[AgentChatBridge] Failed to set Slack assistant status', {
			agentId: options.agentId,
			threadId: thread.id,
			error: error instanceof Error ? error.message : String(error),
		});
	}
	return undefined;
}

/**
 * Kick off the "Thinking..." status set (with retry). Returns the in-flight
 * promise so callers can await it before clearing — see `clearBeforeResponse`
 * in `startSlackThinkingStatus`. The returned promise never rejects; failures
 * are logged inside the retry helper.
 */
async function setSlackAssistantStatus(
	context: SlackThreadContext,
	options: {
		chat: ChatInstance;
		logger: BridgeMessageContextParams['logger'];
		agentId: string;
		statusRetry?: AbortController;
	},
): Promise<void> {
	const adapter = getSlackAssistantStatusAdapter(options.chat);
	if (!adapter) return;

	await setSlackAssistantStatusWithRetry(adapter, context, options);
}

async function clearSlackAssistantStatus(
	context: SlackThreadContext,
	options: {
		chat: ChatInstance;
		logger: BridgeMessageContextParams['logger'];
		agentId: string;
	},
): Promise<void> {
	const adapter = getSlackAssistantStatusAdapter(options.chat);
	if (!adapter) return;

	try {
		await adapter.setAssistantStatus(context.channelId, context.threadTs, '');
	} catch (error) {
		options.logger.warn('[AgentChatBridge] Failed to clear Slack assistant status', {
			agentId: options.agentId,
			channelId: context.channelId,
			threadTs: context.threadTs,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}

async function setSlackAssistantStatusWithRetry(
	adapter: SlackAssistantStatusAdapter,
	context: SlackThreadContext,
	options: {
		logger: BridgeMessageContextParams['logger'];
		agentId: string;
		statusRetry?: AbortController;
	},
): Promise<void> {
	try {
		await adapter.setAssistantStatus(context.channelId, context.threadTs, SLACK_THINKING_STATUS, [
			SLACK_THINKING_STATUS,
		]);
		return;
	} catch (error) {
		if (getSlackErrorCode(error) !== 'invalid_thread_ts') {
			options.logger.warn('[AgentChatBridge] Failed to set Slack assistant status', {
				agentId: options.agentId,
				channelId: context.channelId,
				threadTs: context.threadTs,
				error: error instanceof Error ? error.message : String(error),
			});
			return;
		}
	}

	if (!(await sleep(SLACK_STATUS_RETRY_DELAY_MS, options.statusRetry?.signal))) return;
	// The status may have been cleared while we were sleeping. Bail out so the
	// retry doesn't re-set "Thinking..." over an already-cleared status.
	if (options.statusRetry?.signal.aborted) return;

	try {
		await adapter.setAssistantStatus(context.channelId, context.threadTs, SLACK_THINKING_STATUS, [
			SLACK_THINKING_STATUS,
		]);
	} catch (error) {
		const errorCode = getSlackErrorCode(error);
		const logPayload = {
			agentId: options.agentId,
			channelId: context.channelId,
			threadTs: context.threadTs,
			error: error instanceof Error ? error.message : String(error),
			...(errorCode ? { errorCode } : {}),
		};
		if (errorCode === 'invalid_thread_ts') {
			options.logger.debug(
				'[AgentChatBridge] Slack assistant status unavailable for thread',
				logPayload,
			);
			return;
		}
		options.logger.warn('[AgentChatBridge] Failed to set Slack assistant status', logPayload);
	}
}

function getSlackThreadContext(
	message: BridgeMessageContextParams['message'],
): SlackThreadContext | undefined {
	const raw = message.raw;
	if (!isRecord(raw)) return undefined;

	const channelId = stringValue(raw.channel);
	const realThreadTs = stringValue(raw.thread_ts);
	const threadTs = realThreadTs ?? stringValue(raw.ts);
	if (!channelId || !threadTs) return undefined;

	return {
		channelId,
		threadTs,
		hasRealThreadTs: realThreadTs !== undefined,
	};
}

function getSlackAssistantStatusAdapter(
	chat: ChatInstance,
): SlackAssistantStatusAdapter | undefined {
	const adapter = chat.getAdapter('slack');
	return isSlackAssistantStatusAdapter(adapter) ? adapter : undefined;
}

function stripSlackSelfMention(text: string, userId: string): string {
	const escapedUserId = escapeRegExp(userId);
	return text
		.replace(new RegExp(`(^|\\s)<@!?${escapedUserId}(?:\\|[^>]+)?>`, 'gi'), '$1')
		.replace(new RegExp(`(^|\\s)@${escapedUserId}\\b`, 'gi'), '$1')
		.replace(/\s+/g, ' ')
		.trim();
}

function isSlackAssistantStatusAdapter(value: unknown): value is SlackAssistantStatusAdapter {
	return isRecord(value) && typeof value.setAssistantStatus === 'function';
}

function stringValue(value: unknown): string | undefined {
	return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSlackErrorCode(error: unknown): string | undefined {
	if (!isRecord(error)) return undefined;
	const data = error.data;
	if (!isRecord(data)) return undefined;
	return stringValue(data.error);
}

async function sleep(ms: number, signal?: AbortSignal): Promise<boolean> {
	if (signal?.aborted) return false;
	return await new Promise((resolve) => {
		const timeout = setTimeout(() => {
			signal?.removeEventListener('abort', abort);
			resolve(true);
		}, ms);
		const abort = () => {
			clearTimeout(timeout);
			signal?.removeEventListener('abort', abort);
			resolve(false);
		};
		signal?.addEventListener('abort', abort, { once: true });
	});
}
