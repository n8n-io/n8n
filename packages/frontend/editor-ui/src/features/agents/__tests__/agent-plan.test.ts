import { describe, expect, it } from 'vitest';
import { convertDbMessages } from '@/features/ai/shared/agentsChat/messageMappers';
import { selectLatestAgentPlan } from '../utils/agent-plan';
import { planMessage, planTask, planView } from './fixtures/agent-plan';

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
				planMessage(latest, { tool: 'read_plan' }),
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
		const latest = planView({ revision: 2 });
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
