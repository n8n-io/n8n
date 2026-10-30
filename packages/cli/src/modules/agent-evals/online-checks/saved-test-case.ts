import { UserError } from 'n8n-workflow';

import type { ChatTurn, TimelineEvent } from './types';

/**
 * A test case saved from the test chat: the person's message, the answer they
 * approved or the note they wrote, and the tool data the run used. It lives as
 * a row of the agent's "Saved from test chat" dataset, so the existing eval
 * runner reads it like any other case: `expected_output` is the gold answer and
 * `criteria` the rule. `tool_data` and `saved_at` are for a re-run on the same
 * data; the runner ignores columns its mapping does not name. `thread_id` and
 * `execution_id` let the test chat show a reply as saved after a reload.
 */
export const TEST_CASE_COLUMNS = {
	input: 'input',
	expectedOutput: 'expected_output',
	criteria: 'criteria',
	toolData: 'tool_data',
	savedAt: 'saved_at',
	threadId: 'thread_id',
	executionId: 'execution_id',
} as const;

export type TestCaseVerdict = { verdict: 'looks-right' } | { verdict: 'not-right'; note: string };

export interface PinnedToolCall {
	tool: string;
	input: unknown;
	output: unknown;
}

/**
 * The calls to the agent's own tools, in order. Built-in tools (tool search,
 * chat context, environment) are left out: a re-run does not need them, and
 * chat context carries the n8n user's name. A canceled call returned nothing.
 */
export function pinnedToolCalls(
	timeline: TimelineEvent[],
	ownTools: ReadonlySet<string>,
): PinnedToolCall[] {
	return timeline.flatMap((event) =>
		event.type === 'tool-call' && !event.canceled && ownTools.has(event.name)
			? [{ tool: event.name, input: event.input, output: event.output }]
			: [],
	);
}

export interface TestCaseContext {
	savedAt: Date;
	threadId: string;
	executionId: string;
	ownTools: ReadonlySet<string>;
}

export function testCaseRow(
	turn: ChatTurn,
	judged: TestCaseVerdict,
	{ savedAt, threadId, executionId, ownTools }: TestCaseContext,
): Record<string, string> {
	const input = turn.userMessage.trim();
	if (!input) throw new UserError('This reply has no message to save as a test.');
	const note = judged.verdict === 'not-right' ? judged.note.trim() : '';
	if (judged.verdict === 'not-right' && !note) {
		throw new UserError('A note is required to save a reply that is not right.');
	}

	return {
		[TEST_CASE_COLUMNS.input]: input,
		[TEST_CASE_COLUMNS.expectedOutput]: judged.verdict === 'looks-right' ? turn.reply : '',
		[TEST_CASE_COLUMNS.criteria]: note,
		[TEST_CASE_COLUMNS.toolData]: JSON.stringify(pinnedToolCalls(turn.timeline ?? [], ownTools)),
		[TEST_CASE_COLUMNS.savedAt]: savedAt.toISOString(),
		[TEST_CASE_COLUMNS.threadId]: threadId,
		[TEST_CASE_COLUMNS.executionId]: executionId,
	};
}

export interface SavedTestCaseRecord {
	datasetId: string;
	rowId: number;
	executionId: string;
	verdict: 'looks-right' | 'not-right';
	note?: string;
	toolCalls: number;
}

function cellText(value: unknown): string {
	return typeof value === 'string' ? value : '';
}

function toolCallCount(toolData: string): number {
	try {
		const parsed: unknown = JSON.parse(toolData);
		return Array.isArray(parsed) ? parsed.length : 0;
	} catch {
		return 0;
	}
}

/** A saved row read back for the test chat. Null for a row no test chat saved. */
export function savedCaseFromRow(
	row: Record<string, unknown> & { id: number },
	datasetId: string,
): SavedTestCaseRecord | null {
	const executionId = cellText(row[TEST_CASE_COLUMNS.executionId]);
	if (!executionId) return null;
	const note = cellText(row[TEST_CASE_COLUMNS.criteria]).trim();
	return {
		datasetId,
		rowId: row.id,
		executionId,
		...(note ? { verdict: 'not-right' as const, note } : { verdict: 'looks-right' as const }),
		toolCalls: toolCallCount(cellText(row[TEST_CASE_COLUMNS.toolData])),
	};
}
