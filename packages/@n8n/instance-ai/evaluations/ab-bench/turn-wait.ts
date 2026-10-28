import { setTimeout as delay } from 'node:timers/promises';

import { countEvents } from '../harness/chat-loop';
import type { CapturedEvent } from '../types';

/**
 * Waits for the `run-start` of the turn that was just sent. `waitForAllActivity`
 * reads the whole event list, so without this a follow-up whose `run-start` is
 * late would look finished: the earlier turn's `run-finish` is already there.
 */
export async function waitForNextRunStart(
	events: CapturedEvent[],
	startsBefore: number,
	options: { timeoutMs: number; pollMs: number; onTimeout?: () => Promise<void> },
): Promise<void> {
	const deadline = Date.now() + options.timeoutMs;
	while (countEvents(events, 'run-start') <= startsBefore) {
		if (Date.now() >= deadline) {
			// The message was sent, so a run can still start later. Let the caller cancel it.
			await options.onTimeout?.();
			throw new Error(`No run started within ${String(options.timeoutMs)}ms`);
		}
		await delay(options.pollMs);
	}
}
