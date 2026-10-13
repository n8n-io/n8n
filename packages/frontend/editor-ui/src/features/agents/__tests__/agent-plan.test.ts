import { describe, expect, it } from 'vitest';
import { convertDbMessages } from '@/features/ai/shared/agentsChat/messageMappers';
import { buildAgentPlanDisplayGroups, selectLatestAgentPlan } from '../utils/agent-plan';
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
		expect(selectLatestAgentPlan(messages)?.revision).toBe(2);
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
			input: { planId: initial.planId, expectedRevision: 1, document: progress },
		});
		const messages = [previous, message];
		const call = message.toolCalls![0];
		expect(visibleCalls(messages)).toEqual([initialCallId]);

		call.state = 'done';
		expect(visibleCalls(messages)).toEqual([initialCallId]);
		expect(selectLatestAgentPlan(messages)?.revision).toBe(1);

		call.output = output;
		expect(visibleCalls(messages)).toEqual(visible ? [initialCallId, 'update'] : [initialCallId]);
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

describe('selectLatestAgentPlan', () => {
	it('returns no card without a successful plan result', () => {
		expect(selectLatestAgentPlan([])).toBeNull();
		expect(
			selectLatestAgentPlan([{ id: 'user', role: 'user', content: 'Create a plan' }]),
		).toBeNull();
		expect(selectLatestAgentPlan([planMessage(planView(), { tool: 'write_todos' })])).toBeNull();
	});

	it.each(['create_plan', 'read_plan', 'update_plan', 'close_plan'])(
		'reads a valid %s result',
		(tool) => {
			const plan = planView({ closed: tool === 'close_plan' });
			expect(selectLatestAgentPlan([planMessage(plan, { tool })])).toEqual(plan);
		},
	);

	it('uses revisions instead of response order within one plan', () => {
		const initial = planView();
		const latest = planView({ revision: 3, closed: true });
		expect(
			selectLatestAgentPlan([
				planMessage(initial),
				planMessage(latest, { tool: 'close_plan' }),
				planMessage(planView({ revision: 2 }), { tool: 'read_plan' }),
			]),
		).toEqual(latest);
	});

	it('selects a later plan even when its revision is lower', () => {
		const next = planView({ planId: '22222222-2222-4222-8222-222222222222' });
		expect(
			selectLatestAgentPlan([
				planMessage(planView({ revision: 8, closed: true })),
				planMessage(next),
			]),
		).toEqual(next);
	});

	it.each(['pending', 'running', 'suspended', 'error', 'cancelled'] as const)(
		'keeps the last accepted state during a %s call',
		(state) => {
			const initial = planView();
			expect(
				selectLatestAgentPlan([
					planMessage(initial),
					planMessage(planView({ revision: 2 }), { tool: 'update_plan', state }),
				]),
			).toEqual(initial);
		},
	);

	it.each([
		undefined,
		'not a plan',
		{ error: 'conflict', message: 'Read the plan' },
		{ ...planView(), revision: 0 },
		{ ...planView(), planId: 'invalid' },
		{ ...planView(), closed: 'true' },
		{
			...planView(),
			document: { ...planView().document, presentation: { label: ' ' } },
		},
		{ ...planView(), document: { title: 'Plan', items: [{ ...planTask(1), status: 'unknown' }] } },
		{
			...planView(),
			document: {
				title: 'Plan',
				items: [
					{ ...planTask(1), kind: 'group', tasks: [{ ...planTask(2), kind: 'group', tasks: [] }] },
				],
			},
		},
	])('ignores malformed and error results: %j', (output) => {
		const current = planView();
		expect(
			selectLatestAgentPlan([planMessage(current), planMessage(output, { tool: 'update_plan' })]),
		).toEqual(current);
	});

	it('ignores canceled results even when their state is done', () => {
		expect(selectLatestAgentPlan([planMessage(planView(), { canceled: true })])).toBeNull();
	});

	it('clears the card only for a successful null read and permits a later plan', () => {
		const previous = planMessage(planView({ closed: true }));
		const empty = planMessage(null, { tool: 'read_plan' });
		expect(selectLatestAgentPlan([previous, empty])).toBeNull();
		expect(selectLatestAgentPlan([previous, planMessage(null, { tool: 'update_plan' })])).toEqual(
			planView({ closed: true }),
		);
		expect(
			selectLatestAgentPlan([previous, planMessage(null, { tool: 'read_plan', state: 'error' })]),
		).toEqual(planView({ closed: true }));
		expect(selectLatestAgentPlan([previous, empty, planMessage(planView())])).toEqual(planView());
	});

	it('accepts display fields without duplicating graph validation', () => {
		const view = planView({ document: { title: 'Empty plan', items: [] } });
		expect(
			selectLatestAgentPlan([
				planMessage({
					...view,
					readiness: { ready: [], blocked: [] },
					document: { ...view.document, description: 'Goal' },
				}),
			]),
		).toEqual(view);
	});

	it('restores the same card from persisted tool results', () => {
		const latest = planView({
			revision: 2,
			startedAt: '2026-10-01T10:00:00.000Z',
			closedAt: null,
			document: {
				...planView().document,
				presentation: { label: 'Reviewing sources', detail: 'Checked two of three sources.' },
				items: [
					{ ...planTask(1, 'done'), description: 'Research', resultSummary: 'Found sources' },
				],
			},
		});
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
						output: planView(),
					},
					{
						type: 'tool-call',
						toolCallId: 'update',
						toolName: 'update_plan',
						state: 'resolved',
						output: latest,
					},
				],
			},
		]);
		expect(selectLatestAgentPlan(history)).toEqual(latest);
		expect(selectLatestAgentPlan([])).toBeNull();
	});
});
