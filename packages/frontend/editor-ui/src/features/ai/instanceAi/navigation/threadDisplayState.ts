import { z } from 'zod';
import {
	INSTANCE_AI_THREAD_SERVER_STATES,
	type InstanceAiThreadOverview,
	type InstanceAiThreadServerState,
} from '@n8n/api-types';

/**
 * What a chat needs from this viewer. The server sends `idle` and the editor splits it,
 * because only this browser knows when the viewer last opened the chat.
 */
export type ThreadDisplayState = Exclude<InstanceAiThreadServerState, 'idle'> | 'ready' | 'done';

const serverStateSchema = z.enum(INSTANCE_AI_THREAD_SERVER_STATES);

/** Returns the time in milliseconds, or `undefined` for a missing or invalid date. */
export function toTime(value: string | undefined): number | undefined {
	const time = new Date(value ?? Number.NaN).getTime();
	return Number.isNaN(time) ? undefined : time;
}

/**
 * Same rule as `hasUnseenActivity` on the server (thread-overview/thread-state.ts), so that both
 * sides agree. Without two valid times we cannot prove that the viewer saw the last activity.
 */
function hasUnseenActivity(lastActivityAt: string | undefined, lastViewedAt: string | undefined) {
	const activityTime = toTime(lastActivityAt);
	const viewedTime = toTime(lastViewedAt);
	if (activityTime === undefined || viewedTime === undefined) return true;
	return activityTime > viewedTime;
}

/**
 * Returns `undefined` when the summary has no valid state: the server sets it only for the
 * first 50 threads. A pending approval or question always wins, as on the server.
 */
export function threadDisplayState(
	summary: InstanceAiThreadOverview,
	lastViewedAt?: string,
): ThreadDisplayState | undefined {
	if (summary.needsInput === true) return 'needs-you';
	// `data` is undefined for a missing or unknown state.
	const state = serverStateSchema.safeParse(summary.state).data;
	if (state !== 'idle') return state;
	return hasUnseenActivity(summary.lastActivityAt, lastViewedAt) ? 'ready' : 'done';
}
