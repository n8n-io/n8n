import type { InstanceAiAgentNode, InstanceAiEvent } from '@n8n/api-types';
import {
	createInitialState,
	instanceAiEventSchema,
	reduceEvent,
	toAgentTree,
} from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';

import type {
	BackfillMessageRow,
	BackfillSnapshotRow,
	SynthesizedRow,
} from './1784000000051-BackfillInstanceAiEventLog';
import {
	extractMessageText,
	synthesizeThreadEvents,
} from './1784000000051-BackfillInstanceAiEventLog';

const AT = new Date('2026-07-01T10:00:00.000Z');

function snapshotRow(overrides: Partial<BackfillSnapshotRow> = {}): BackfillSnapshotRow {
	return {
		runId: 'run-1',
		messageGroupId: 'group-1',
		runIds: null,
		tree: null,
		createdAt: AT,
		...overrides,
	};
}

function assistantMessage(
	id: string,
	content: string,
	createdAt = AT,
	role = 'assistant',
): BackfillMessageRow {
	return { id, role, content, createdAt };
}

/** Parse + schema-validate every synthesized payload (throws on any drift). */
function toEvents(rows: SynthesizedRow[]): InstanceAiEvent[] {
	return rows.map((row) => instanceAiEventSchema.parse(jsonParse(row.payload)));
}

/** Fold synthesized rows through the real shared reducer, as the read path does. */
function fold(rows: SynthesizedRow[]): InstanceAiAgentNode {
	const events = toEvents(rows);
	const state = createInitialState();
	for (const event of events) reduceEvent(state, event);
	return toAgentTree(state);
}

const RICH_TREE: Record<string, unknown> = {
	agentId: 'agent-001',
	role: 'orchestrator',
	status: 'completed',
	textContent: 'Hello. Done.',
	reasoning: 'thinking hard',
	timeline: [
		{ type: 'reasoning', content: 'thinking hard' },
		{ type: 'text', content: 'Hello. ' },
		{ type: 'tool-call', toolCallId: 'tc-1' },
		{ type: 'child', agentId: 'sub-1' },
		{ type: 'text', content: 'Done.' },
	],
	toolCalls: [
		{
			toolCallId: 'tc-1',
			toolName: 'search-workflows',
			args: { query: 'invoices' },
			result: { total: 2 },
			isLoading: false,
		},
	],
	children: [
		{
			agentId: 'sub-1',
			role: 'builder',
			kind: 'builder',
			title: 'Building workflow',
			tools: ['update-workflow'],
			status: 'completed',
			result: 'built it',
			textContent: 'sub text',
			reasoning: '',
			timeline: [
				{ type: 'text', content: 'sub text' },
				{ type: 'tool-call', toolCallId: 'tc-s1' },
			],
			toolCalls: [
				{
					toolCallId: 'tc-s1',
					toolName: 'update-workflow',
					args: { id: 'w1' },
					error: 'boom',
					isLoading: false,
				},
			],
			children: [],
		},
	],
};

describe('synthesizeThreadEvents', () => {
	it('round-trips a rich snapshot tree through the real schema and reducer', () => {
		const rows = synthesizeThreadEvents({
			snapshots: [snapshotRow({ tree: JSON.stringify(RICH_TREE) })],
			assistantMessages: [],
			existingRunIds: new Set(),
		});

		// Schema validation happens inside toEvents/fold; a mismatch throws.
		const tree = fold(rows);

		expect(tree.agentId).toBe('agent-001');
		expect(tree.status).toBe('completed');
		expect(tree.textContent).toBe('Hello. Done.');
		expect(tree.reasoning).toBe('thinking hard');
		// Timeline order survives: reasoning, text, tool, child, text.
		expect(tree.timeline.map((e) => e.type)).toEqual([
			'reasoning',
			'text',
			'tool-call',
			'child',
			'text',
		]);
		const rootCall = tree.toolCalls.find((tc) => tc.toolCallId === 'tc-1');
		expect(rootCall?.result).toEqual({ total: 2 });
		expect(rootCall?.isLoading).toBe(false);

		const child = tree.children.find((c) => c.agentId === 'sub-1');
		expect(child?.title).toBe('Building workflow');
		expect(child?.kind).toBe('builder');
		expect(child?.status).toBe('completed');
		expect(child?.result).toBe('built it');
		expect(child?.textContent).toBe('sub text');
		const childCall = child?.toolCalls.find((tc) => tc.toolCallId === 'tc-s1');
		expect(childCall?.error).toBe('boom');
	});

	it('terminalizes in-flight tool calls via the synthesized run-finish, not fake results', () => {
		const tree = {
			agentId: 'agent-001',
			role: 'orchestrator',
			status: 'cancelled',
			cancellationReason: 'user',
			textContent: '',
			reasoning: '',
			timeline: [{ type: 'tool-call', toolCallId: 'tc-open' }],
			toolCalls: [
				{ toolCallId: 'tc-open', toolName: 'update-workflow', args: {}, isLoading: true },
			],
			children: [],
		};
		const rows = synthesizeThreadEvents({
			snapshots: [snapshotRow({ tree: JSON.stringify(tree) })],
			assistantMessages: [],
			existingRunIds: new Set(),
		});

		const events = toEvents(rows);
		// No fabricated terminal fact for the in-flight call.
		expect(events.some((e) => e.type === 'tool-result' || e.type === 'tool-error')).toBe(false);
		const finish = events.at(-1);
		expect(finish?.type === 'run-finish' && finish.payload.status).toBe('cancelled');
		expect(finish?.type === 'run-finish' && finish.payload.reason).toBe('user_cancelled');

		const folded = fold(rows);
		const call = folded.toolCalls.find((tc) => tc.toolCallId === 'tc-open');
		expect(call?.isLoading).toBe(false);
		expect(folded.cancellationReason).toBe('user');
	});

	it('always writes terminal-complete runs, so the sweeper predicate never matches them', () => {
		const rows = synthesizeThreadEvents({
			snapshots: [
				snapshotRow({ runId: 'run-a', tree: JSON.stringify(RICH_TREE) }),
				snapshotRow({
					runId: 'run-b',
					messageGroupId: 'group-b',
					// Frozen mid-flight before the sweep existed.
					tree: JSON.stringify({ ...RICH_TREE, agentId: 'agent-b', status: 'active' }),
					createdAt: new Date(AT.getTime() + 1000),
				}),
			],
			assistantMessages: [],
			existingRunIds: new Set(),
		});
		const events = toEvents(rows);

		const runIds = [...new Set(events.map((e) => e.runId))];
		// findUnfinishedRuns matches run-start without run-finish: must be empty.
		const unfinished = runIds.filter(
			(runId) =>
				events.some((e) => e.runId === runId && e.type === 'run-start') &&
				!events.some((e) => e.runId === runId && e.type === 'run-finish'),
		);
		expect(unfinished).toEqual([]);

		const finishB = events.find((e) => e.runId === 'run-b' && e.type === 'run-finish');
		expect(finishB?.type === 'run-finish' && finishB.payload.status).toBe('interrupted');
		expect(finishB?.type === 'run-finish' && finishB.payload.reason).toBe('backfill_unterminated');
	});

	it('skips runs that already have event rows (idempotent, Gate B re-runnable)', () => {
		const rows = synthesizeThreadEvents({
			snapshots: [snapshotRow({ tree: JSON.stringify(RICH_TREE) })],
			assistantMessages: [],
			existingRunIds: new Set(['run-1']),
		});
		expect(rows).toEqual([]);
	});

	it('covers merged-group sibling runIds with lifecycle-only rows in the same group', () => {
		const rows = synthesizeThreadEvents({
			snapshots: [
				snapshotRow({ runIds: ['run-1', 'run-2', 'run-3'], tree: JSON.stringify(RICH_TREE) }),
			],
			assistantMessages: [],
			existingRunIds: new Set(['run-3']),
		});
		const events = toEvents(rows);

		const run2 = events.filter((e) => e.runId === 'run-2');
		expect(run2.map((e) => e.type)).toEqual(['run-start', 'run-finish']);
		const run2Start = run2[0];
		expect(run2Start.type === 'run-start' && run2Start.payload.messageGroupId).toBe('group-1');
		// Already-covered sibling emitted nothing.
		expect(events.some((e) => e.runId === 'run-3')).toBe(false);
	});

	it('synthesizes flat runs from assistant messages only when the thread has no snapshots', () => {
		const partsContent = JSON.stringify([
			{ type: 'text', text: 'part one ' },
			{ type: 'reasoning', reasoning: 'hidden' },
			{ type: 'text', text: 'part two' },
		]);
		const rows = synthesizeThreadEvents({
			snapshots: [],
			assistantMessages: [
				assistantMessage('msg-1', 'plain answer'),
				assistantMessage('msg-2', partsContent, new Date(AT.getTime() + 1000)),
				assistantMessage('msg-user', 'ignored', AT, 'user'),
				assistantMessage('msg-empty', JSON.stringify([{ type: 'tool', id: 'x' }])),
			],
			existingRunIds: new Set(),
		});
		const events = toEvents(rows);

		const tree1 = fold(rows.filter((r) => r.runId === 'msg-1'));
		expect(tree1.textContent).toBe('plain answer');
		const tree2 = fold(rows.filter((r) => r.runId === 'msg-2'));
		expect(tree2.textContent).toBe('part one part two');
		expect(events.some((e) => e.runId === 'msg-user')).toBe(false);
		expect(events.some((e) => e.runId === 'msg-empty')).toBe(false);

		// With a snapshot present, the flat fallback stays off.
		const mixed = synthesizeThreadEvents({
			snapshots: [snapshotRow({ tree: JSON.stringify(RICH_TREE) })],
			assistantMessages: [assistantMessage('msg-1', 'plain answer')],
			existingRunIds: new Set(),
		});
		expect(mixed.some((r) => r.runId === 'msg-1')).toBe(false);
	});

	it('marks every synthesized run and block with the backfill prefix', () => {
		const rows = synthesizeThreadEvents({
			snapshots: [snapshotRow({ tree: JSON.stringify(RICH_TREE) })],
			assistantMessages: [],
			existingRunIds: new Set(),
		});
		const events = toEvents(rows);

		for (const event of events) {
			if (event.type === 'run-start') {
				expect(event.payload.messageId).toMatch(/^backfill:/);
			}
			if (event.type === 'text-block' || event.type === 'reasoning-block') {
				expect(event.responseId).toMatch(/^backfill:/);
			}
			expect(event.ts).toBe(AT.getTime());
		}
	});

	it('unique block responseIds keep adjacent blocks from merging in the reducer', () => {
		const tree = {
			agentId: 'agent-001',
			role: 'orchestrator',
			status: 'completed',
			textContent: 'one two',
			reasoning: '',
			timeline: [
				{ type: 'text', content: 'one ' },
				{ type: 'text', content: 'two' },
			],
			toolCalls: [],
			children: [],
		};
		const rows = synthesizeThreadEvents({
			snapshots: [snapshotRow({ tree: JSON.stringify(tree) })],
			assistantMessages: [],
			existingRunIds: new Set(),
		});
		const folded = fold(rows);
		expect(folded.textContent).toBe('one two');
		expect(folded.timeline.filter((e) => e.type === 'text')).toHaveLength(2);
	});

	it('degenerate or unparseable trees produce lifecycle-only rows', () => {
		const rows = synthesizeThreadEvents({
			snapshots: [
				snapshotRow({ runId: 'run-null', tree: null }),
				snapshotRow({
					runId: 'run-junk',
					tree: 'not-json{',
					createdAt: new Date(AT.getTime() + 1000),
				}),
			],
			assistantMessages: [],
			existingRunIds: new Set(),
		});
		const events = toEvents(rows);

		for (const runId of ['run-null', 'run-junk']) {
			const runEvents = events.filter((e) => e.runId === runId);
			expect(runEvents.map((e) => e.type)).toEqual(['run-start', 'run-finish']);
		}
	});
});

describe('extractMessageText', () => {
	it('passes plain strings through and joins text parts', () => {
		expect(extractMessageText('hello')).toBe('hello');
		expect(
			extractMessageText(
				JSON.stringify([
					{ type: 'text', text: 'a' },
					{ type: 'text', text: 'b' },
				]),
			),
		).toBe('ab');
		expect(extractMessageText(JSON.stringify({ some: 'object' }))).toBe(
			JSON.stringify({ some: 'object' }),
		);
	});
});
