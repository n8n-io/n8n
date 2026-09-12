import type { ExecutionSummary } from 'n8n-workflow';

import { parseExecutionCursor } from '../execution-cursor';
import { mergeExecutionPages } from '../merge-execution-pages';

const time = '2026-09-07T12:00:00.000Z';
const uuid = '01992380-0000-7000-8000-000000000001';
const item = (id: string, timestamp = time): ExecutionSummary => ({
	id,
	workflowId: 'wf',
	mode: 'manual',
	status: 'success',
	createdAt: new Date(timestamp),
	startedAt: new Date(timestamp),
});

describe('mergeExecutionPages', () => {
	it('walks tied source pages without advancing an unconsumed source', () => {
		const first = mergeExecutionPages(
			[
				{ items: [item('10'), item('9')], hasMore: false },
				{ items: [item(uuid)], hasMore: false },
			],
			1,
			{ version: 1 },
		);
		expect(first.results.map((row) => row.id)).toEqual([uuid]);
		const cursor = parseExecutionCursor(first.nextCursor!);
		expect(cursor.v1).toBeUndefined();
		expect(cursor.v2).toEqual({ id: uuid, timestamp: time });
		const second = mergeExecutionPages(
			[{ items: [item('10'), item('9')], hasMore: false }],
			1,
			cursor,
		);
		expect(second.results.map((row) => row.id)).toEqual(['10']);
		expect(parseExecutionCursor(second.nextCursor!).v2).toEqual(cursor.v2);
		const third = mergeExecutionPages(
			[{ items: [item('9')], hasMore: false }],
			1,
			parseExecutionCursor(second.nextCursor!),
		);
		expect(third.results.map((row) => row.id)).toEqual(['9']);
		expect(third.nextCursor).toBeNull();
	});

	it('uses creation time for a row with no start time', () => {
		const row = { ...item('1', '2026-09-07T12:00:01.000Z'), startedAt: null };
		expect(
			mergeExecutionPages([{ items: [item(uuid), row], hasMore: false }], 2, { version: 1 })
				.results,
		).toEqual([row, item(uuid)]);
	});

	it('keeps a continuation when the source has unseen rows', () => {
		expect(
			mergeExecutionPages([{ items: [item('1')], hasMore: true }], 1, { version: 1 }).nextCursor,
		).not.toBeNull();
	});
});
