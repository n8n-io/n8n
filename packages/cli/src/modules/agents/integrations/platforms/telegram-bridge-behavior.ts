import { isRecord } from '@n8n/utils/is-record';
import type { Thread } from 'chat';

import type {
	BridgeExecutionContext,
	BridgeMessageContextParams,
	BridgeResumeExecutionContext,
	BridgeStatusHandle,
} from '../agent-chat-integration';
import type {
	IntegrationPlatformMessageContext,
	TelegramMessageAttachmentContext,
} from '../integration-tools';
import { startTypingIndicator } from './typing-indicator';

/** Telegram's typing action expires after ~5s, so keep it alive on an interval. */
const TELEGRAM_TYPING_REFRESH_MS = 4000;

export function createTelegramBridgeExecutionContext(
	params: BridgeMessageContextParams,
): BridgeExecutionContext {
	const platformMessage = getTelegramPlatformMessageContext(params.message);
	return {
		platformAgentContext: {},
		...(platformMessage ? { platformMessage } : {}),
		statusHandle:
			params.startStatus === false
				? undefined
				: startTelegramTypingIndicator(params.thread, {
						logger: params.logger,
						agentId: params.agentId,
					}),
	};
}

export function getTelegramPlatformMessageContext(
	message: BridgeMessageContextParams['message'],
): IntegrationPlatformMessageContext | undefined {
	if (!isRecord(message.raw) || !isRecord(message.raw.chat)) return undefined;

	const chatId = toTelegramId(message.raw.chat.id);
	const messageId = toTelegramId(message.raw.message_id);
	if (!chatId || !messageId) return undefined;

	const messageThreadId = toTelegramId(message.raw.message_thread_id);
	const attachments = (message.attachments ?? []).flatMap(
		(attachment): TelegramMessageAttachmentContext[] => {
			const fileId = attachment.fetchMetadata?.fileId;
			if (!fileId) return [];
			const fileUniqueId = attachment.fetchMetadata?.fileUniqueId;
			return [
				{
					type: attachment.type,
					file_id: fileId,
					...(fileUniqueId ? { file_unique_id: fileUniqueId } : {}),
				},
			];
		},
	);

	return {
		type: 'telegram',
		chat_id: chatId,
		message_id: messageId,
		...(messageThreadId ? { message_thread_id: messageThreadId } : {}),
		attachments,
	};
}

function toTelegramId(value: unknown): string | undefined {
	if (typeof value === 'string' && value.length > 0) return value;
	if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
	return undefined;
}

export function createTelegramResumeExecutionContext(params: {
	thread: Thread<unknown, unknown>;
	logger: BridgeMessageContextParams['logger'];
	agentId: string;
}): BridgeResumeExecutionContext {
	return {
		statusHandle: startTelegramTypingIndicator(params.thread, {
			logger: params.logger,
			agentId: params.agentId,
		}),
	};
}

/**
 * Show Telegram's "typing…" indicator for the duration of an agent run.
 *
 * Telegram clears the indicator on its own — after ~5s or as soon as the bot
 * posts a message — so stopping only means clearing the refresh interval; no
 * remote "clear" call is needed.
 */
export function startTelegramTypingIndicator(
	thread: Thread<unknown, unknown>,
	options: {
		logger: BridgeMessageContextParams['logger'];
		agentId: string;
	},
): BridgeStatusHandle {
	return startTypingIndicator(thread, {
		...options,
		platform: 'Telegram',
		refreshMs: TELEGRAM_TYPING_REFRESH_MS,
	});
}
