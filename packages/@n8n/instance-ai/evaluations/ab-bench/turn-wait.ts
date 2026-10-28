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
	{ timeoutMs, pollMs }: { timeoutMs: number; pollMs: number },
): Promise<void> {
	const deadline = Date.now() + timeoutMs;
	while (countEvents(events, 'run-start') <= startsBefore) {
		if (Date.now() >= deadline) throw new Error(`No run started within ${String(timeoutMs)}ms`);
		await delay(pollMs);
	}
}
