import type { Thread } from 'chat';

import type {
	BridgeExecutionContext,
	BridgeMessageContextParams,
	BridgeResumeExecutionContext,
	BridgeStatusHandle,
} from '../agent-chat-integration';
import { startTypingIndicator } from './typing-indicator';

/** Telegram's typing action expires after ~5s, so keep it alive on an interval. */
const TELEGRAM_TYPING_REFRESH_MS = 4000;

export function createTelegramBridgeExecutionContext(
	params: BridgeMessageContextParams,
): BridgeExecutionContext {
	return {
		platformAgentContext: {},
		statusHandle: startTelegramTypingIndicator(params.thread, {
			logger: params.logger,
			agentId: params.agentId,
		}),
	};
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
