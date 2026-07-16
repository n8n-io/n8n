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
	let failed = false;
	let stopped = false;
	let inFlight: Promise<void> | null = null;

	const sendTyping = async () => {
		try {
			await thread.startTyping();
			failed = false;
		} catch (error) {
			// Warn once per failure streak; an interval failing every 4s must not
			// spam the logs.
			const log = failed ? options.logger.debug : options.logger.warn;
			failed = true;

			log.call(options.logger, '[AgentChatBridge] Failed to send Telegram typing indicator', {
				agentId: options.agentId,
				threadId: thread.id,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	};

	// Single in-flight send: if the Telegram API is slow, skip ticks instead of
	// stacking concurrent requests.
	const trySend = () => {
		if (stopped || inFlight) return;
		inFlight = sendTyping().finally(() => {
			inFlight = null;
		});
	};

	trySend();

	const interval = setInterval(trySend, TELEGRAM_TYPING_REFRESH_MS);
	interval.unref();

	const maxLifetime = setTimeout(() => clearInterval(interval), TELEGRAM_TYPING_MAX_LIFETIME_MS);
	maxLifetime.unref();

	return {
		clearBeforeResponse: async () => {
			stopped = true;
			clearInterval(interval);
			clearTimeout(maxLifetime);

			// An in-flight send can't be recalled — wait for it to land so the
			// reply message posts after it and Telegram's clear-on-message wipes
			// the indicator, instead of the send resurrecting it post-reply.
			if (inFlight) await inFlight;
		},
	};
}
