import type { Thread } from 'chat';

import type {
	BridgeExecutionContext,
	BridgeMessageContextParams,
	BridgeResumeExecutionContext,
	BridgeStatusHandle,
} from '../agent-chat-integration';

/** Telegram's typing action expires after ~5s, so keep it alive on an interval. */
const TELEGRAM_TYPING_REFRESH_MS = 4000;

/**
 * Backstop against an interval leak: `clearBeforeResponse` runs on every
 * stream-consumer path, but an error between context creation and stream
 * consumption would leave the interval running with nothing to stop it.
 */
const TELEGRAM_TYPING_MAX_LIFETIME_MS = 10 * 60 * 1000;

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
	let failedStreak = false;
	let inFlight: Promise<void> | null = null;

	const sendTyping = () => {
		// A slow send outliving the refresh interval must not pile up requests.
		if (inFlight) return;
		inFlight = thread
			.startTyping()
			.then(() => {
				failedStreak = false;
			})
			.catch((error) => {
				// Warn once per failure streak; a send failing every 4s must not
				// spam the logs.
				const log = failedStreak ? options.logger.debug : options.logger.warn;
				failedStreak = true;
				log.call(options.logger, '[AgentChatBridge] Failed to send Telegram typing indicator', {
					agentId: options.agentId,
					threadId: thread.id,
					error: error instanceof Error ? error.message : String(error),
				});
			})
			.finally(() => {
				inFlight = null;
			});
	};

	sendTyping();
	const interval = setInterval(sendTyping, TELEGRAM_TYPING_REFRESH_MS);
	interval.unref();
	const maxLifetime = setTimeout(() => clearInterval(interval), TELEGRAM_TYPING_MAX_LIFETIME_MS);
	maxLifetime.unref();

	return {
		clearBeforeResponse: async () => {
			clearInterval(interval);
			clearTimeout(maxLifetime);
			// Let an in-flight typing send land before the reply posts, so the
			// send can't arrive after the message and re-show a stale indicator.
			await inFlight;
		},
	};
}
