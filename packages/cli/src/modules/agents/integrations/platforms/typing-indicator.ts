import type { Thread } from 'chat';

import type { BridgeMessageContextParams, BridgeStatusHandle } from '../agent-chat-integration';

/**
 * Backstop against an interval leak: `clearBeforeResponse` runs on every
 * stream-consumer path, but an error between context creation and stream
 * consumption would leave the interval running with nothing to stop it.
 */
const TYPING_MAX_LIFETIME_MS = 10 * 60 * 1000;

export interface TypingIndicatorOptions {
	logger: BridgeMessageContextParams['logger'];
	agentId: string;
	/** Brand name used in log messages, e.g. "Telegram". */
	platform: string;
	/** How often to re-send, below the platform's own expiry. */
	refreshMs: number;
}

/**
 * Show a platform's "typing…" indicator for the duration of an agent run.
 *
 * Every platform we support expires the indicator on its own — after a few
 * seconds, or as soon as the bot posts — so stopping means clearing the refresh
 * interval; no remote "clear" call is needed.
 */
export function startTypingIndicator(
	thread: Thread<unknown, unknown>,
	options: TypingIndicatorOptions,
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
				// Warn once per failure streak; a send failing every few seconds
				// must not spam the logs.
				const log = failedStreak ? options.logger.debug : options.logger.warn;
				failedStreak = true;
				log.call(
					options.logger,
					`[AgentChatBridge] Failed to send ${options.platform} typing indicator`,
					{
						agentId: options.agentId,
						threadId: thread.id,
						error: error instanceof Error ? error.message : String(error),
					},
				);
			})
			.finally(() => {
				inFlight = null;
			});
	};

	sendTyping();
	const interval = setInterval(sendTyping, options.refreshMs);
	interval.unref();
	const maxLifetime = setTimeout(() => clearInterval(interval), TYPING_MAX_LIFETIME_MS);
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
