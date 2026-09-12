import type { InstanceAiToolCallState, PlannedTaskArg } from '@n8n/api-types';

import { resolvePlanTasks } from '../planReview.utils';

const PLANNED_TASK: PlannedTaskArg = {
	id: 'task-1',
	title: 'Ingest orders into a Data Table',
	kind: 'workflow',
	spec: 'Webhook -> Data Table insert',
	deps: [],
};

function makeToolCall(overrides: Partial<InstanceAiToolCallState> = {}): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'create-tasks',
		args: {},
		isLoading: true,
		...overrides,
	};
}

function makeConfirmation(
	overrides: Partial<NonNullable<InstanceAiToolCallState['confirmation']>> = {},
) {
	return {
		requestId: 'req-plan',
		message: 'Review the plan',
		severity: 'info' as const,
		inputType: 'plan-review' as const,
		...overrides,
	};
}

describe('resolvePlanTasks', () => {
	it('prefers confirmation.planItems when present', () => {
		const tc = makeToolCall({
			confirmation: makeConfirmation({ planItems: [PLANNED_TASK] }),
			args: { tasks: [{ ...PLANNED_TASK, id: 'from-args' }] },
		});

		expect(resolvePlanTasks(tc)).toEqual([PLANNED_TASK]);
	});

	// The create-tasks suspend payload carries `tasks` only and never `planItems`,
	// so args.tasks is the real-world source for a live plan-review card.
	it('falls back to args.tasks when planItems is absent', () => {
		const tc = makeToolCall({
			confirmation: makeConfirmation(),
			args: { tasks: [PLANNED_TASK, { ...PLANNED_TASK, id: 'task-2' }] },
		});

		expect(resolvePlanTasks(tc)).toHaveLength(2);
		expect(resolvePlanTasks(tc)[0].id).toBe('task-1');
	});

	it('maps the simplified confirmation.tasks checklist when nothing richer exists', () => {
		const tc = makeToolCall({
			confirmation: makeConfirmation({
				tasks: {
					tasks: [{ id: 'task-9', description: 'Reconcile failures', status: 'todo' }],
				},
			}),
		});

		expect(resolvePlanTasks(tc)).toEqual([
			{ id: 'task-9', title: 'Reconcile failures', kind: '', spec: '', deps: [] },
		]);
	});

	it('returns an empty list when the tool call carries no plan at all', () => {
		expect(resolvePlanTasks(makeToolCall())).toEqual([]);
	});

	// `isDisplayableConfirmationRequest` treats an empty `planItems` as "no plan
	// items", so the card renders off args.tasks and the count has to agree.
	it('falls back to args.tasks when planItems is present but empty', () => {
		const tc = makeToolCall({
			confirmation: makeConfirmation({ planItems: [] }),
			args: { tasks: [PLANNED_TASK] },
		});

		expect(resolvePlanTasks(tc)).toEqual([PLANNED_TASK]);
	});

	it('falls back to the confirmation.tasks checklist when args.tasks is present but empty', () => {
		const tc = makeToolCall({
			confirmation: makeConfirmation({
				tasks: { tasks: [{ id: 'task-9', description: 'Reconcile failures', status: 'todo' }] },
			}),
			args: { tasks: [] },
		});

		expect(resolvePlanTasks(tc)).toEqual([
			{ id: 'task-9', title: 'Reconcile failures', kind: '', spec: '', deps: [] },
		]);
	});

	it('returns an empty list when confirmation.tasks is present but empty', () => {
		const tc = makeToolCall({ confirmation: makeConfirmation({ tasks: { tasks: [] } }) });

		expect(resolvePlanTasks(tc)).toEqual([]);
	});
});
