import type { MessageRecord, TimelineEvent } from '../../execution-recorder';
import { MARK_SESSION_FAILED_TOOL_NAME } from '../../tools/mark-session-failed.tool';
import { applyFatalSessionOutcome, MAX_ITERATIONS_STOPPED_MESSAGE } from '../fatal-session-outcome';

function toolCall(
	overrides: Partial<Extract<TimelineEvent, { type: 'tool-call' }>> &
		Pick<Extract<TimelineEvent, { type: 'tool-call' }>, 'name' | 'success' | 'input'>,
): TimelineEvent {
	return {
		type: 'tool-call',
		kind: 'tool',
		toolCallId: 'tc',
		output: {},
		startTime: 0,
		endTime: 1,
		...overrides,
	};
}

function record(overrides: Partial<MessageRecord> = {}): MessageRecord {
	return {
		assistantResponse: 'Done',
		model: null,
		finishReason: 'stop',
		usage: null,
		totalCost: null,
		usageDetails: null,
		timeline: [],
		startTime: 0,
		duration: 1,
		error: null,
		...overrides,
	};
}

describe('applyFatalSessionOutcome', () => {
	it('keeps an existing execution error', () => {
		const existing = record({
			error: 'stream failed',
			finishReason: 'max-iterations',
			timeline: [
				toolCall({
					name: MARK_SESSION_FAILED_TOOL_NAME,
					success: true,
					input: { reason: 'gave up' },
				}),
			],
		});

		expect(applyFatalSessionOutcome(existing)).toBe(existing);
	});

	it('uses the last successful mark and ignores a later failed call', () => {
		const existing = record({
			timeline: [
				toolCall({
					name: MARK_SESSION_FAILED_TOOL_NAME,
					toolCallId: 'older',
					success: true,
					input: { reason: ' older ' },
				}),
				toolCall({
					name: MARK_SESSION_FAILED_TOOL_NAME,
					toolCallId: 'latest',
					success: true,
					input: { reason: '  latest reason  ' },
				}),
				toolCall({
					name: MARK_SESSION_FAILED_TOOL_NAME,
					toolCallId: 'failed',
					success: false,
					input: { reason: 'nope' },
				}),
			],
		});

		expect(applyFatalSessionOutcome(existing)).toEqual({ ...existing, error: 'latest reason' });
	});

	it('marks a max-iterations finish when the tool was not called', () => {
		const existing = record({ finishReason: 'max-iterations' });

		expect(applyFatalSessionOutcome(existing)).toEqual({
			...existing,
			error: MAX_ITERATIONS_STOPPED_MESSAGE,
		});
	});

	it('ignores a successful mark whose reason is not a string and keeps scanning', () => {
		const existing = record({
			timeline: [
				toolCall({
					name: MARK_SESSION_FAILED_TOOL_NAME,
					toolCallId: 'good',
					success: true,
					input: { reason: 'first reason' },
				}),
				toolCall({
					name: MARK_SESSION_FAILED_TOOL_NAME,
					toolCallId: 'bad',
					success: true,
					input: { reason: 12 },
				}),
			],
		});

		expect(applyFatalSessionOutcome(existing).error).toBe('first reason');
	});

	it('leaves a recovered tool failure unchanged', () => {
		const existing = record({
			timeline: [
				toolCall({
					name: 'lookup',
					success: false,
					input: {},
				}),
			],
		});

		expect(applyFatalSessionOutcome(existing)).toBe(existing);
	});
});
