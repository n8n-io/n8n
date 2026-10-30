import type { BuiltTool } from '@n8n/agents';

import type { TimelineEvent } from '../../execution-recorder';
import {
	HELD_MESSAGE,
	heldResult,
	isHeldOutput,
	lastRealOutputs,
	standInFromOutput,
	wrapToolForTestSandbox,
} from '../test-sandbox';

describe('standInFromOutput', () => {
	it('keeps the shape and replaces every value, so no real data reaches a test', () => {
		expect(
			standInFromOutput({
				eventId: 'evt_9f2c',
				attendee: 'ana@example.com',
				minutes: 30,
				confirmed: true,
				note: null,
			}),
		).toEqual({
			eventId: 'test-eventId',
			attendee: 'test-attendee',
			minutes: 0,
			confirmed: true,
			note: null,
		});
	});

	it('keeps one stand-in item for a list, built from its first item', () => {
		expect(standInFromOutput({ items: [{ id: 'a1' }, { id: 'a2' }], empty: [] })).toEqual({
			items: [{ id: 'test-id' }],
			empty: [],
		});
	});

	it('replaces a value that is not an object', () => {
		expect(standInFromOutput('Refund 4411 created')).toBe('test-value');
		expect(standInFromOutput(42)).toBe(0);
	});
});

describe('heldResult', () => {
	it('says the call was not run, with no stand-in when the tool never ran for real', () => {
		expect(heldResult(undefined)).toEqual({
			testMode: true,
			status: 'held',
			message: HELD_MESSAGE,
		});
	});

	it('wraps a stand-in so the agent sees the usual fields and that they are placeholders', () => {
		expect(heldResult({ eventId: 'test-eventId' })).toEqual({
			testMode: true,
			status: 'held',
			message: HELD_MESSAGE,
			result: { eventId: 'test-eventId' },
		});
	});
});

describe('isHeldOutput', () => {
	it('recognises a held result and nothing else', () => {
		expect(isHeldOutput(heldResult(undefined))).toBe(true);
		expect(isHeldOutput({ status: 'held' })).toBe(false);
		expect(isHeldOutput('held')).toBe(false);
	});
});

function call(
	name: string,
	output: unknown,
	overrides: Partial<Extract<TimelineEvent, { type: 'tool-call' }>> = {},
): TimelineEvent {
	return {
		type: 'tool-call',
		kind: 'workflow',
		name,
		toolCallId: `${name}-${JSON.stringify(output)}`,
		input: {},
		output,
		startTime: 0,
		endTime: 1,
		success: true,
		...overrides,
	} as TimelineEvent;
}

describe('lastRealOutputs', () => {
	it('keeps the latest real output of each tool, newest timeline last', () => {
		const outputs = lastRealOutputs([
			[call('book_meeting', { eventId: 'old' })],
			[call('book_meeting', { eventId: 'new' }), call('send_email', { messageId: 'm1' })],
		]);

		expect(outputs.get('book_meeting')).toEqual({ eventId: 'new' });
		expect(outputs.get('send_email')).toEqual({ messageId: 'm1' });
	});

	it('skips calls that failed, were declined, or were held in a test', () => {
		const outputs = lastRealOutputs([
			[
				call('book_meeting', { eventId: 'real' }),
				call('book_meeting', { status: 'error', error: 'Timeout' }),
				call('book_meeting', { declined: true }),
				call('book_meeting', heldResult(undefined)),
				call('book_meeting', { eventId: 'x' }, { success: false }),
			],
		]);

		expect(outputs.get('book_meeting')).toEqual({ eventId: 'real' });
	});
});

describe('wrapToolForTestSandbox', () => {
	const tool = {
		name: 'book_meeting',
		description: 'Books a meeting',
		handler: vi.fn().mockResolvedValue({ eventId: 'real' }),
	} as unknown as BuiltTool;

	it('keeps the tool as the agent sees it', () => {
		const held = wrapToolForTestSandbox(tool, heldResult(undefined));

		expect(held.name).toBe('book_meeting');
		expect(held.description).toBe('Books a meeting');
	});

	it('returns the held result and never runs the tool', async () => {
		const result = heldResult({ eventId: 'test-eventId' });
		const held = wrapToolForTestSandbox(tool, result);

		await expect(held.handler!({}, {} as never)).resolves.toEqual(result);
		expect(tool.handler).not.toHaveBeenCalled();
	});
});
