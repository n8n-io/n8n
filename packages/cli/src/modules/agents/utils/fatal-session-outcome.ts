import { isRecord } from '@n8n/utils/is-record';

import type { MessageRecord, TimelineEvent } from '../execution-recorder';
import { MARK_SESSION_FAILED_TOOL_NAME } from '../tools/mark-session-failed.tool';

export const MAX_ITERATIONS_STOPPED_MESSAGE =
	'The agent has reached the maximum number of iterations and has stopped.';

const MAX_REASON_LENGTH = 400;

function markedSessionFailureReason(timeline: TimelineEvent[]): string | null {
	for (let index = timeline.length - 1; index >= 0; index--) {
		const event = timeline[index];
		if (
			event?.type !== 'tool-call' ||
			event.name !== MARK_SESSION_FAILED_TOOL_NAME ||
			!event.success
		) {
			continue;
		}
		if (!isRecord(event.input) || typeof event.input.reason !== 'string') continue;
		const reason = event.input.reason.trim().slice(0, MAX_REASON_LENGTH);
		if (reason.length > 0) return reason;
	}
	return null;
}

/**
 * Copy a fatal outcome onto the execution error so the stored status becomes
 * `error`. An error already on the record wins. A mark-session-failed call
 * wins over a max-iterations stop.
 */
export function applyFatalSessionOutcome(record: MessageRecord): MessageRecord {
	if (record.error !== null) return record;
	const reason = markedSessionFailureReason(record.timeline);
	if (reason !== null) return { ...record, error: reason };
	if (record.finishReason === 'max-iterations') {
		return { ...record, error: MAX_ITERATIONS_STOPPED_MESSAGE };
	}
	return record;
}

/**
 * Whether a stored execution error came from `applyFatalSessionOutcome`.
 * Chat history does not show these as error bubbles, because the live stream
 * does not show them.
 */
export function isFatalSessionOutcomeError(
	error: string,
	timeline: TimelineEvent[] | null,
): boolean {
	return (
		error === MAX_ITERATIONS_STOPPED_MESSAGE || error === markedSessionFailureReason(timeline ?? [])
	);
}
