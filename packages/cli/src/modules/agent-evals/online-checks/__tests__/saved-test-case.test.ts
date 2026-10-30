import {
	TEST_CASE_COLUMNS,
	pinnedToolCalls,
	savedCaseFromRow,
	testCaseRow,
} from '../saved-test-case';
import type { ChatTurn, TimelineEvent } from '../types';

function call(
	name: string,
	output: unknown,
	overrides: Partial<Extract<TimelineEvent, { type: 'tool-call' }>> = {},
): TimelineEvent {
	return {
		type: 'tool-call',
		kind: 'workflow',
		name,
		toolCallId: name,
		input: { orderId: '1042' },
		output,
		startTime: 0,
		endTime: 1,
		success: true,
		...overrides,
	} as TimelineEvent;
}

const turn: ChatTurn = {
	userMessage: 'Where is my order 1042?',
	reply: 'It shipped on Monday with DHL.',
	timeline: [
		call('anthropic.tool_search', { tools: ['lookup_order'] }, { kind: 'tool' }),
		call('chat_context', { userName: 'Ana' }, { kind: 'tool' }),
		call('lookup_order', { status: 'shipped', carrier: 'DHL' }),
		{ type: 'text', content: 'It shipped on Monday with DHL.', timestamp: 2 } as TimelineEvent,
		call('get_shipping_status', { status: 'error', error: 'Timeout' }),
		call('cancelled_call', {}, { canceled: true }),
	],
};

const ownTools = new Set(['lookup_order', 'get_shipping_status', 'cancelled_call']);
const context = {
	savedAt: new Date('2026-10-30T13:00:00.000Z'),
	threadId: 'thread-1',
	executionId: 'exec-1',
	ownTools,
};

describe('pinnedToolCalls', () => {
	it("keeps the calls to the agent's own tools, failures included, and drops built-ins", () => {
		expect(pinnedToolCalls(turn.timeline ?? [], ownTools)).toEqual([
			{
				tool: 'lookup_order',
				input: { orderId: '1042' },
				output: { status: 'shipped', carrier: 'DHL' },
			},
			{
				tool: 'get_shipping_status',
				input: { orderId: '1042' },
				output: { status: 'error', error: 'Timeout' },
			},
		]);
	});
});

describe('testCaseRow', () => {
	it('saves the message, the approved reply, the tool data, the time and the run for "Looks right"', () => {
		const row = testCaseRow(turn, { verdict: 'looks-right' }, context);

		expect(row).toEqual({
			[TEST_CASE_COLUMNS.input]: 'Where is my order 1042?',
			[TEST_CASE_COLUMNS.expectedOutput]: 'It shipped on Monday with DHL.',
			[TEST_CASE_COLUMNS.criteria]: '',
			[TEST_CASE_COLUMNS.toolData]: JSON.stringify(pinnedToolCalls(turn.timeline ?? [], ownTools)),
			[TEST_CASE_COLUMNS.savedAt]: '2026-10-30T13:00:00.000Z',
			[TEST_CASE_COLUMNS.threadId]: 'thread-1',
			[TEST_CASE_COLUMNS.executionId]: 'exec-1',
		});
	});

	it('saves the note as the rule and no expected answer for "Not right"', () => {
		const row = testCaseRow(
			turn,
			{ verdict: 'not-right', note: '  It should name the delivery day.  ' },
			context,
		);

		expect(row[TEST_CASE_COLUMNS.expectedOutput]).toBe('');
		expect(row[TEST_CASE_COLUMNS.criteria]).toBe('It should name the delivery day.');
	});

	it('refuses "Not right" without a note, since the note is the only rule the case has', () => {
		expect(() => testCaseRow(turn, { verdict: 'not-right', note: '  ' }, context)).toThrow(
			'A note is required',
		);
	});

	it('refuses a turn with no message, since there is nothing to send again', () => {
		expect(() =>
			testCaseRow({ ...turn, userMessage: '' }, { verdict: 'looks-right' }, context),
		).toThrow('no message');
	});
});

describe('savedCaseFromRow', () => {
	it('reads back "Looks right", with how many tool calls were kept', () => {
		const row = { id: 7, ...testCaseRow(turn, { verdict: 'looks-right' }, context) };

		expect(savedCaseFromRow(row, 'dataset-1')).toEqual({
			datasetId: 'dataset-1',
			rowId: 7,
			executionId: 'exec-1',
			verdict: 'looks-right',
			toolCalls: 2,
		});
	});

	it('reads back "Not right" with its note', () => {
		const row = {
			id: 8,
			...testCaseRow(turn, { verdict: 'not-right', note: 'Name the day.' }, context),
		};

		expect(savedCaseFromRow(row, 'dataset-1')).toEqual(
			expect.objectContaining({ verdict: 'not-right', note: 'Name the day.' }),
		);
	});

	it('skips a row with no run, such as one typed into the table by hand', () => {
		expect(savedCaseFromRow({ id: 9, [TEST_CASE_COLUMNS.input]: 'Hi' }, 'dataset-1')).toBeNull();
	});
});
