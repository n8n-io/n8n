import type { PushMessageMeta } from '@n8n/api-types';
import { v4 as uuid } from 'uuid';

/**
 * Builds the additive `meta` envelope carried on terminal execution events
 * (`executionFinished`, `executionWaiting`). Single source of truth so the
 * live-push and reconnect-replay paths emit an identically shaped envelope.
 *
 * `eventId` is per-emission (a replay gets a fresh id); dedup on the client is
 * keyed on `executionId`, not `eventId`. `ts` is the server emit time.
 */
export function createTerminalExecutionEventMeta(options?: {
	replayed?: boolean;
}): PushMessageMeta {
	const meta: PushMessageMeta = {
		eventId: uuid(),
		ts: new Date().toISOString(),
	};

	if (options?.replayed) meta.replayed = true;

	return meta;
}
