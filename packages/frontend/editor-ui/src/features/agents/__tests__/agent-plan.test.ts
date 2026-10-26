import { describe, expect, it } from 'vitest';
import { convertDbMessages } from '@/features/ai/shared/agentsChat/messageMappers';
import { buildAgentPlanDisplayGroups } from '../utils/agent-plan';
import type { ChatMessage, ToolCall } from '@/features/ai/shared/agentsChat/types';
import { planMessage, planTask, planView } from './fixtures/agent-plan';

describe('buildAgentPlanDisplayGroups', () => {
	const initialCallId = expect.stringMatching(/^plan-call-\d+$/);
	const initial = {
		...planView(),
		document: {
			title: 'Compare platforms',
			description: 'Choose a support platform',
			items: [
				{ ...planTask(1), description: 'Find candidates', dependsOn: [] },
				{ ...planTask(2), description: 'Compare candidates', dependsOn: [planTask(1).id] },
			],
		},
	};
	const update = (document: unknown, overrides: Partial<ToolCall> = {}) =>
		planMessage(
			{ ...initial, revision: 2, document },
			{ tool: 'update_plan', toolCallId: 'update', ...overrides },
		);
	function visibleCalls(messages: ChatMessage[]) {
		return buildAgentPlanDisplayGroups(messages).flatMap((group) =>
			group.kind === 'toolRun'
				? group.toolCalls.map((call) => call.toolCallId)
				: group.kind === 'message'
					? (group.message.toolCalls ?? []).map((call) => call.toolCallId)
					: [],
		);
	}
	const progress = {
		...initial.document,
		presentation: { label: 'Compare candidates', detail: 'Found three candidates' },
		items: initial.document.items.map((item) => ({
			...item,
			title: `Completed ${item.title}`,
			status: 'done',
			resultSummary: 'Found candidates',
			startedAt: '2026-10-01T10:00:00Z',
			endedAt: '2026-10-01T10:01:00Z',
		})),
	};

	it('hides progress without changing the stored messages or current card', () => {
		const messages = [planMessage(initial), update(progress)];
		const before = structuredClone(messages);
		expect(visibleCalls(messages)).toEqual([initialCallId]);
		expect(messages).toEqual(before);
	});

	it('keeps a tool run with only hidden plan calls when it has host events', () => {
		const userMessage: ChatMessage = { id: 'user-1', role: 'user', content: 'Continue' };
		const created = planMessage(initial);
		const eventless = update({
			...progress,
			items: progress.items.map((item) => ({ ...item, status: 'in_progress' })),
		});
		const hidden: ChatMessage = {
			...eventless,
			hostEvents: [{ id: 'host-1', name: 'test.start', payload: {} }],
		};

		const groups = buildAgentPlanDisplayGroups([created, userMessage, hidden]);

		const run = groups.at(-1);
		expect(run?.id).toBe(hidden.id);
		expect(run?.kind === 'toolRun' && run.toolCalls).toEqual([]);
		expect(
			buildAgentPlanDisplayGroups([created, userMessage, eventless]).map((group) => group.id),
		).not.toContain(eventless.id);
	});

	it('filters each plan call independently across messages', () => {
		const current = { ...initial, revision: 2, document: progress };
		const created = planMessage(initial);
		const updated = planMessage(current, { tool: 'update_plan' });
		const read = planMessage(current, { tool: 'read_plan' });
		const messages = [created, updated, read];

		expect(new Set(messages.map((message) => message.id)).size).toBe(3);
		expect(visibleCalls(messages)).toEqual([
			created.toolCalls![0].toolCallId,
			read.toolCalls![0].toolCallId,
		]);
	});

	it.each([
		['plan title', { ...progress, title: 'New goal' }],
		['plan description', { ...progress, description: 'New requirements' }],
		['added task', { ...progress, items: [...progress.items, planTask(3)] }],
		['removed task', { ...progress, items: progress.items.slice(1) }],
		['task order', { ...progress, items: [...progress.items].reverse() }],
		[
			'task description',
			{
				...progress,
				items: [{ ...progress.items[0], description: 'New scope' }, progress.items[1]],
			},
		],
		[
			'dependencies',
			{ ...progress, items: [progress.items[0], { ...progress.items[1], dependsOn: [] }] },
		],
		[
			'fallback',
			{
				...progress,
				items: [progress.items[0], { ...progress.items[1], fallbackFor: planTask(1).id }],
			},
		],
		['unknown document field', { ...progress, futureRule: true }],
		[
			'unknown task field',
			{ ...progress, items: [{ ...progress.items[0], futureRule: true }, progress.items[1]] },
		],
	])('keeps a change to %s visible', (_name, document) => {
		expect(visibleCalls([planMessage(initial), update(document)])).toEqual([
			initialCallId,
			'update',
		]);
	});

	it('ignores group progress but keeps group membership and order changes visible', () => {
		const group = { ...planTask(10), kind: 'group' as const, tasks: initial.document.items };
		const document = { ...initial.document, items: [group, planTask(3)] };
		const previous = planMessage({ ...initial, document });
		const changedGroup = {
			...group,
			title: 'Compared',
			status: 'done',
			resultSummary: 'Done',
			tasks: progress.items,
		};
		expect(
			visibleCalls([previous, update({ ...document, items: [changedGroup, planTask(3)] })]),
		).toEqual([initialCallId]);
		for (const items of [
			[planTask(3), changedGroup],
			[{ ...changedGroup, tasks: progress.items.slice(1) }, progress.items[0], planTask(3)],
			[{ ...changedGroup, tasks: [...progress.items].reverse() }, planTask(3)],
		]) {
			expect(visibleCalls([previous, update({ ...document, items })])).toEqual([
				initialCallId,
				'update',
			]);
		}
	});

	it.each(['pending', 'running', 'done'] as const)(
		'hides a known progress-only %s call before its result arrives',
		(state) => {
			const call = update(progress, {
				state,
				output: undefined,
				input: { planId: initial.planId, expectedRevision: 1, document: progress },
			});
			expect(visibleCalls([planMessage(initial), call])).toEqual([initialCallId]);
		},
	);

	it.each(['pending', 'running', 'done'] as const)(
		'hides a partial progress update while %s without changing the card',
		(state) => {
			const call = update(undefined, {
				state,
				output: undefined,
				input: {
					planId: initial.planId,
					expectedRevision: 1,
					document: { items: [{ id: planTask(1).id, status: 'done' }] },
				},
			});
			const messages = [planMessage(initial), call];
			expect(visibleCalls(messages)).toEqual([initialCallId]);
			call.toolCalls![0].state = 'done';
			call.toolCalls![0].output = { error: 'invalid_plan' };
			expect(visibleCalls(messages)).toEqual([initialCallId, 'update']);
		},
	);

	it('hides partial presentation and child progress updates', () => {
		const group = { ...planTask(10), kind: 'group' as const, tasks: initial.document.items };
		const previous = planMessage({ ...initial, document: { ...initial.document, items: [group] } });
		for (const document of [
			{ presentation: { detail: 'Reviewed research' } },
			{ presentation: null },
			{
				items: [
					{ id: group.id, tasks: [{ id: planTask(1).id, status: 'done', resultSummary: null }] },
				],
			},
		]) {
			expect(
				visibleCalls([
					previous,
					update(undefined, {
						state: 'running',
						output: undefined,
						input: { planId: initial.planId, expectedRevision: 1, document },
					}),
				]),
			).toEqual([initialCallId]);
		}
	});

	it.each([
		{ document: { items: [{ id: planTask(1).id, description: 'Changed scope' }] } },
		{ document: { items: [{ id: planTask(2).id, dependsOn: [] }] } },
		{ document: { items: [{ id: planTask(3).id, status: 'done' }] } },
		{ document: { items: [{ id: planTask(1).id, kind: 'group', tasks: [] }] } },
		{ document: { items: [{ id: 'new:task', title: 'New task' }] } },
		{ document: { items: [{ id: planTask(1).id, futureRule: true }] } },
		{ document: progress, removeItemIds: [planTask(2).id] },
	])('keeps partial scope changes and unknown items visible: %j', (input) => {
		expect(
			visibleCalls([
				planMessage(initial),
				update(undefined, {
					state: 'running',
					output: undefined,
					input: { planId: initial.planId, expectedRevision: 1, ...input },
				}),
			]),
		).toEqual([initialCallId, 'update']);
	});

	it.each([
		['progress', { ...initial, revision: 2, document: progress }, false],
		[
			'scope change',
			{ ...initial, revision: 2, document: { ...progress, title: 'New goal' } },
			true,
		],
		['conflict', { error: 'conflict' }, true],
		['invalid plan', { error: 'invalid_plan' }, true],
		['null', null, true],
		['malformed', 'malformed', true],
	])('uses the %s result after completion without output', (_name, output, visible) => {
		const previous = planMessage(initial);
		const message = update(progress, {
			state: 'running',
			output: undefined,
			input: {
				planId: initial.planId,
				expectedRevision: 1,
				document: { items: [{ id: planTask(1).id, status: 'done' }] },
			},
		});
		const messages = [previous, message];
		const call = message.toolCalls![0];
		expect(visibleCalls(messages)).toEqual([initialCallId]);

		call.state = 'done';
		expect(visibleCalls(messages)).toEqual([initialCallId]);

		call.output = output;
		expect(visibleCalls(messages)).toEqual(visible ? [initialCallId, 'update'] : [initialCallId]);
	});

	describe.each(['pending', 'running', 'done'] as const)('partial %s updates', (state) => {
		it.each([
			['task progress', { items: [{ id: planTask(1).id, status: 'done', title: 'Researched' }] }],
			['cleared result', { items: [{ id: planTask(1).id, resultSummary: null }] }],
			['presentation', { presentation: { label: 'Researching' } }],
			['presentation detail', { presentation: { detail: null } }],
			['cleared presentation', { presentation: null }],
			['empty items', { items: [] }],
			['unchanged scope', { items: [{ id: planTask(1).id, description: 'Find candidates' }] }],
		])('hides %s before its result arrives', (_name, document) => {
			const messages = [
				planMessage(initial),
				update(progress, {
					state,
					output: undefined,
					input: { planId: initial.planId, expectedRevision: 1, document, removeItemIds: [] },
				}),
			];
			const before = structuredClone(messages);
			expect(visibleCalls(messages)).toEqual([initialCallId]);
			expect(messages).toEqual(before);
		});

		it('hides child progress without the group fields or sibling tasks', () => {
			const group = { ...planTask(10), kind: 'group', tasks: initial.document.items };
			const previous = planMessage({
				...initial,
				document: { ...initial.document, items: [group] },
			});
			const call = update(progress, {
				state,
				output: undefined,
				input: {
					planId: initial.planId,
					expectedRevision: 1,
					document: { items: [{ id: group.id, tasks: [{ id: planTask(1).id, status: 'done' }] }] },
				},
			});
			expect(visibleCalls([previous, call])).toEqual([initialCallId]);
		});

		it.each([
			['plan title', { document: { title: 'New goal' } }],
			['description', { document: { items: [{ id: planTask(1).id, description: 'New scope' }] } }],
			['dependencies', { document: { items: [{ id: planTask(2).id, dependsOn: [] }] } }],
			['fallback', { document: { items: [{ id: planTask(2).id, fallbackFor: planTask(1).id }] } }],
			['removal', { document: {}, removeItemIds: [planTask(1).id] }],
			['removal with full document', { document: progress, removeItemIds: [planTask(1).id] }],
			['new item', { document: { items: [{ ...planTask(3), id: 'new:task' }] } }],
			['unknown item', { document: { items: [{ id: planTask(99).id, status: 'done' }] } }],
			['unknown field', { document: { items: [{ id: planTask(1).id, futureRule: true }] } }],
			['tasks on a task', { document: { items: [{ id: planTask(1).id, tasks: [] }] } }],
			['duplicate item', { document: { items: [{ id: planTask(1).id }, { id: planTask(1).id }] } }],
		])('keeps %s visible', (_name, input) => {
			const call = update(progress, {
				state,
				output: undefined,
				input: { planId: initial.planId, expectedRevision: 1, ...input },
			});
			expect(visibleCalls([planMessage(initial), call])).toEqual([initialCallId, 'update']);
		});
	});

	it.each([
		{ state: 'error' as const },
		{ state: 'suspended' as const },
		{ state: 'cancelled' as const },
		{ canceled: true },
		{ output: { error: 'conflict', message: 'Read the current plan' } },
		{ output: { error: 'invalid_plan' } },
		{ output: 'malformed' },
		{
			state: 'running' as const,
			input: { planId: initial.planId, expectedRevision: 99, document: progress },
		},
	])('keeps errors and uncertain calls visible: %j', (overrides) => {
		expect(visibleCalls([planMessage(initial), update(progress, overrides)])).toEqual([
			initialCallId,
			'update',
		]);
	});

	it('requires the preceding revision of the same plan', () => {
		expect(visibleCalls([update(progress)])).toEqual(['update']);
		expect(visibleCalls([planMessage({ ...initial, revision: 4 }), update(progress)])).toEqual([
			initialCallId,
			'update',
		]);
		expect(
			visibleCalls([planMessage({ ...initial, planId: planTask(99).id }), update(progress)]),
		).toEqual([initialCallId, 'update']);
	});

	it('keeps create, read, and close calls visible', () => {
		for (const tool of ['create_plan', 'read_plan', 'close_plan']) {
			expect(visibleCalls([planMessage(initial), update(progress, { tool })])).toEqual([
				initialCallId,
				'update',
			]);
		}
	});

	it('restores filtering from persisted results without tool inputs', () => {
		const history = convertDbMessages([
			{
				id: 'assistant',
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'create',
						toolName: 'create_plan',
						state: 'resolved',
						output: initial,
					},
					{
						type: 'tool-call',
						toolCallId: 'update',
						toolName: 'update_plan',
						state: 'resolved',
						output: { ...initial, revision: 2, document: progress },
					},
				],
			},
		]);
		expect(visibleCalls(history)).toEqual(['create']);
	});
});
