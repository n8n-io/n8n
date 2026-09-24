import { randomUUID } from 'node:crypto';

import {
	AgentPlanValidationError,
	parseAgentPlan,
	type AgentPlanDocument,
	type AgentPlanGroup,
	type AgentPlanItem,
	type AgentPlanStatus,
	type AgentPlanTask,
} from '../agent-plan.schema';
import { getAgentPlanReadiness, prepareAgentPlan } from '../agent-plan.validation';

const started = new Date('2026-09-24T10:00:00.000Z');
const ended = new Date('2026-09-24T10:05:00.000Z');
const task = (overrides: Partial<AgentPlanTask> = {}): AgentPlanTask => ({
	id: randomUUID(),
	kind: 'task',
	title: 'Task',
	description: 'Do the work',
	status: 'pending',
	dependsOn: [],
	startedAt: null,
	endedAt: null,
	...overrides,
});
const group = (
	tasks: AgentPlanTask[],
	overrides: Partial<AgentPlanGroup> = {},
): AgentPlanGroup => ({
	id: randomUUID(),
	kind: 'group',
	title: 'Phase',
	description: 'Complete the phase',
	status: 'pending',
	dependsOn: [],
	startedAt: null,
	endedAt: null,
	tasks,
	...overrides,
});
const plan = (...items: AgentPlanItem[]): AgentPlanDocument => ({
	title: 'Plan',
	description: 'Goal',
	items,
});
const prepare = (next: unknown, previous: AgentPlanDocument | null = null, now = started) =>
	prepareAgentPlan(next, 1, previous, now);
const setStatuses = (document: AgentPlanDocument, statuses: Record<string, AgentPlanStatus>) => {
	const copy = structuredClone(document);
	for (const item of copy.items.flatMap((item) =>
		item.kind === 'group' ? [item, ...item.tasks] : [item],
	)) {
		if (statuses[item.id]) item.status = statuses[item.id];
	}
	return copy;
};

describe('Agent plan schema', () => {
	it('parses both item types and initializes timestamps without changing input', () => {
		const data = plan(task({ resultSummary: 'A summary' }), group([task()]));
		const before = structuredClone(data);
		expect(prepare(data)).toEqual(data);
		expect(data).toEqual(before);
		const { startedAt: _startedAt, endedAt: _endedAt, ...withoutTimestamps } = task();
		expect(parseAgentPlan(plan(withoutTimestamps as AgentPlanTask), 1).items[0]).toMatchObject({
			startedAt: null,
			endedAt: null,
		});
	});

	it.each([0, 2, 1.5])('rejects unsupported format %s', (version) => {
		expect(() => parseAgentPlan(plan(), version)).toThrow('Unsupported plan format version');
	});

	it.each([
		['unknown plan fields', { ...plan(), extra: true }],
		['unknown task fields', plan({ ...task(), extra: true } as AgentPlanTask)],
		['unknown group fields', plan({ ...group([]), extra: true } as AgentPlanGroup)],
		['nested groups', plan(group([group([]) as unknown as AgentPlanTask]))],
		['group fallbacks', plan({ ...group([]), fallbackFor: randomUUID() } as AgentPlanGroup)],
		['invalid IDs', plan(task({ id: 'task-1' }))],
		['invalid dependency IDs', plan(task({ dependsOn: ['task-1'] }))],
		['invalid timestamps', plan(task({ startedAt: 'yesterday' }))],
		['invalid statuses', plan(task({ status: 'paused' as AgentPlanStatus }))],
		['empty titles', plan(task({ title: '' }))],
	])('rejects %s', (_label, data) => {
		expect(() => parseAgentPlan(data, 1)).toThrow(AgentPlanValidationError);
	});
});

describe('Agent plan graph', () => {
	it('makes independent tasks ready together and preserves their order', () => {
		const first = task();
		const second = task();
		expect(getAgentPlanReadiness(prepare(plan(first, second)))).toEqual({
			ready: [first.id, second.id],
			blocked: [],
		});
	});

	it('unblocks a linear sequence only after its prerequisite is Done', () => {
		const first = task();
		const second = task({ dependsOn: [first.id] });
		const third = task({ dependsOn: [second.id] });
		const initial = prepare(plan(first, second, third));
		const running = prepare(setStatuses(initial, { [first.id]: 'in_progress' }), initial);
		expect(getAgentPlanReadiness(running)).toEqual({
			ready: [],
			blocked: [
				{ id: second.id, blockedBy: [first.id] },
				{ id: third.id, blockedBy: [second.id] },
			],
		});
		const done = prepare(setStatuses(running, { [first.id]: 'done' }), running, ended);
		expect(getAgentPlanReadiness(done)).toEqual({
			ready: [second.id],
			blocked: [{ id: third.id, blockedBy: [second.id] }],
		});
	});

	it('applies root prerequisites to every task in a group', () => {
		const prerequisite = task();
		const first = task();
		const second = task({ dependsOn: [first.id] });
		const phase = group([first, second], { dependsOn: [prerequisite.id] });
		const initial = prepare(plan(prerequisite, phase));
		expect(getAgentPlanReadiness(initial)).toEqual({
			ready: [prerequisite.id],
			blocked: [
				{ id: phase.id, blockedBy: [prerequisite.id] },
				{ id: first.id, blockedBy: [prerequisite.id] },
				{ id: second.id, blockedBy: [first.id, prerequisite.id] },
			],
		});
		expect(() => prepare(setStatuses(initial, { [first.id]: 'in_progress' }), initial)).toThrow(
			'Prerequisites',
		);
		const next = prepare(setStatuses(initial, { [prerequisite.id]: 'done' }), initial);
		expect(getAgentPlanReadiness(next).ready).toEqual([phase.id, first.id]);
	});

	it('allows root tasks and groups to depend on each other', () => {
		const first = group([task()]);
		const second = task({ dependsOn: [first.id] });
		const third = group([], { dependsOn: [second.id] });
		expect(prepare(plan(first, second, third)).items).toEqual([first, second, third]);
	});

	it.each(['missing', 'self', 'duplicate', 'cross-group', 'parent', 'child'] as const)(
		'rejects %s dependencies',
		(kind) => {
			const first = task();
			const second = task();
			const phase = group([second]);
			const invalid = {
				missing: randomUUID(),
				self: first.id,
				duplicate: phase.id,
				'cross-group': second.id,
				parent: phase.id,
				child: second.id,
			}[kind];
			if (kind === 'parent') second.dependsOn = [phase.id];
			else if (kind === 'child') phase.dependsOn = [second.id];
			else first.dependsOn = kind === 'duplicate' ? [invalid, invalid] : [invalid];
			expect(() => prepare(plan(first, phase))).toThrow(AgentPlanValidationError);
		},
	);

	it('rejects dependencies across two groups', () => {
		const first = task();
		const second = task({ dependsOn: [first.id] });
		expect(() => prepare(plan(group([first]), group([second])))).toThrow('same level');
	});

	it('rejects duplicate dependencies when reading a stored document', () => {
		const first = task();
		const second = task({ dependsOn: [first.id, first.id] });
		expect(() => getAgentPlanReadiness(plan(first, second))).toThrow('Dependencies must be unique');
	});

	it.each(['root', 'group'])('rejects cycles at the %s level', (level) => {
		const first = task();
		const second = task({ dependsOn: [first.id] });
		const third = task({ dependsOn: [second.id] });
		first.dependsOn = [third.id];
		const items = [first, second, third];
		expect(() => prepare(level === 'root' ? plan(...items) : plan(group(items)))).toThrow('cycle');
	});

	it('rejects cycles between root tasks and groups', () => {
		const first = task();
		const phase = group([], { dependsOn: [first.id] });
		first.dependsOn = [phase.id];
		expect(() => prepare(plan(first, phase))).toThrow('cycle');
	});

	it('rejects duplicate IDs across levels and different UUID letter case', () => {
		const first = task();
		expect(() => prepare(plan(first, group([task({ id: first.id.toUpperCase() })])))).toThrow(
			'IDs must be unique',
		);
	});
});

describe('Agent plan changes', () => {
	it('grows and edits a pending plan without changing the previous document', () => {
		const initial = prepare(plan(task()));
		const copy = structuredClone(initial);
		const next = prepare(
			{
				...initial,
				title: 'Updated plan',
				items: [
					{ ...initial.items[0], title: 'New title', description: 'New scope' },
					group([task()]),
				],
			},
			initial,
		);
		expect(next.items).toHaveLength(2);
		expect(initial).toEqual(copy);
	});

	it.each(['in_progress', 'done', 'failed', 'cancelled'] as const)(
		'rejects new items in %s',
		(status) => {
			expect(() => prepare(plan(task({ status })))).toThrow('New items must be Pending');
		},
	);

	it('allows removal only when all remaining references are valid', () => {
		const first = task();
		const second = task({ dependsOn: [first.id] });
		const initial = prepare(plan(first, second, group([task()])));
		expect(() => prepare(plan(second), initial)).toThrow('same level');
		expect(prepare(plan({ ...second, dependsOn: [] }), initial).items).toHaveLength(1);
	});

	it.each(['in_progress', 'done', 'failed', 'cancelled'] as const)(
		'preserves %s tasks',
		(status) => {
			const first = task();
			const initial = prepare(plan(first));
			const previous = prepare(setStatuses(initial, { [first.id]: status }), initial);
			expect(() => prepare(plan(), previous)).toThrow('Only Pending');
		},
	);

	it('preserves a Pending group that contains started work', () => {
		const child = task();
		const initial = prepare(plan(group([child])));
		const previous = prepare(setStatuses(initial, { [child.id]: 'in_progress' }), initial);
		expect(() => prepare(plan(), previous)).toThrow('Only Pending');
	});

	it('rejects changes to item types and group membership', () => {
		const first = task();
		const phase = group([]);
		const initial = prepare(plan(first, phase));
		expect(() => prepare(plan({ ...phase, tasks: [first] }), initial)).toThrow('type or group');
		expect(() => prepare(plan(group([], { id: first.id }), phase), initial)).toThrow(
			'type or group',
		);
	});

	it.each(['in_progress', 'done', 'failed'] as const)('requires prerequisites for %s', (status) => {
		const first = task();
		const second = task({ dependsOn: [first.id] });
		const initial = prepare(plan(first, second));
		expect(() => prepare(setStatuses(initial, { [second.id]: status }), initial)).toThrow(
			'Prerequisites',
		);
		expect(
			prepare(setStatuses(initial, { [first.id]: 'done', [second.id]: status }), initial).items[1]
				.status,
		).toBe(status);
	});

	it('permits cancellation when a prerequisite is not Done', () => {
		const first = task();
		const second = task({ dependsOn: [first.id] });
		const initial = prepare(plan(first, second));
		expect(
			prepare(setStatuses(initial, { [second.id]: 'cancelled' }), initial).items[1].status,
		).toBe('cancelled');
	});

	it('permits titles and summaries, but freezes active task scope and dependencies', () => {
		const first = task();
		const initial = prepare(plan(first));
		const previous = prepare(setStatuses(initial, { [first.id]: 'in_progress' }), initial);
		const current = previous.items[0];
		expect(
			prepare(plan({ ...current, title: 'Clearer title', resultSummary: 'Progress' }), previous)
				.items[0],
		).toMatchObject({
			title: 'Clearer title',
			resultSummary: 'Progress',
		});
		expect(() => prepare(plan({ ...current, description: 'Different work' }), previous)).toThrow(
			'description or dependencies',
		);
		expect(() => prepare(plan({ ...current, dependsOn: [randomUUID()] }), previous)).toThrow(
			'description or dependencies',
		);
		expect(() => prepare(setStatuses(previous, { [first.id]: 'pending' }), previous)).toThrow(
			'cannot become Pending',
		);
	});

	it.each(['done', 'failed', 'cancelled'] as const)('keeps %s tasks unchanged', (status) => {
		const first = task();
		const initial = prepare(plan(first));
		const previous = prepare(setStatuses(initial, { [first.id]: status }), initial);
		for (const changes of [
			{ status: 'in_progress' as const },
			{ title: 'Changed' },
			{ resultSummary: 'Changed' },
			{ dependsOn: [randomUUID()] },
		]) {
			expect(() => prepare(plan({ ...previous.items[0], ...changes }), previous)).toThrow(
				'Final items cannot change',
			);
		}
		expect(prepare(previous, previous, ended)).toEqual(previous);
	});

	it.each(['done', 'failed', 'cancelled'] as const)(
		'requires final children before a group becomes %s',
		(status) => {
			const child = task();
			const phase = group([child]);
			const initial = prepare(plan(phase));
			expect(() => prepare(setStatuses(initial, { [phase.id]: status }), initial)).toThrow(
				'Every task',
			);
			const previous = prepare(setStatuses(initial, { [child.id]: 'in_progress' }), initial);
			expect(() => prepare(setStatuses(previous, { [phase.id]: status }), previous)).toThrow(
				'Every task',
			);
			const next = prepare(
				setStatuses(previous, { [child.id]: 'cancelled', [phase.id]: status }),
				previous,
			);
			expect(next.items[0].status).toBe(status);
			const finalGroup = next.items[0] as AgentPlanGroup;
			expect(() => prepare(plan({ ...finalGroup, tasks: [] }), next)).toThrow('Only Pending');
			expect(() =>
				prepare(
					plan({
						...finalGroup,
						tasks: [...finalGroup.tasks, task()],
					}),
					next,
				),
			).toThrow('Final items');
		},
	);

	it('does not infer a group status when its tasks finish', () => {
		const child = task();
		const phase = group([child]);
		const initial = prepare(plan(phase));
		expect(prepare(setStatuses(initial, { [child.id]: 'done' }), initial).items[0].status).toBe(
			'pending',
		);
	});
});

describe('Agent plan timestamps', () => {
	it('sets start and end times only on transitions', () => {
		const first = task();
		const initial = prepare(plan(first));
		const running = prepare(setStatuses(initial, { [first.id]: 'in_progress' }), initial);
		expect(running.items[0]).toMatchObject({ startedAt: started.toISOString(), endedAt: null });
		expect(prepare(running, running, ended)).toEqual(running);
		const done = prepare(setStatuses(running, { [first.id]: 'done' }), running, ended);
		expect(done.items[0]).toMatchObject({
			startedAt: started.toISOString(),
			endedAt: ended.toISOString(),
		});
		expect(prepare(done, done, new Date('2026-09-25T00:00:00Z'))).toEqual(done);
	});

	it.each(['done', 'failed', 'cancelled'] as const)(
		'timestamps direct %s transitions',
		(status) => {
			const first = task();
			const initial = prepare(plan(first));
			const next = prepare(setStatuses(initial, { [first.id]: status }), initial, ended);
			expect(next.items[0]).toMatchObject({
				startedAt: status === 'cancelled' ? null : ended.toISOString(),
				endedAt: ended.toISOString(),
			});
		},
	);

	it('rejects caller timestamps on new and existing items', () => {
		expect(() => prepare(plan(task({ startedAt: started.toISOString() })))).toThrow('Timestamps');
		const initial = prepare(plan(task()));
		const running = prepare(
			setStatuses(initial, { [initial.items[0].id]: 'in_progress' }),
			initial,
		);
		for (const changes of [
			{ startedAt: null },
			{ startedAt: ended.toISOString() },
			{ endedAt: ended.toISOString() },
		]) {
			expect(() => prepare(plan({ ...running.items[0], ...changes }), running)).toThrow(
				'Timestamps',
			);
		}
	});
});

describe('Agent plan fallbacks', () => {
	it.each(['failed', 'cancelled'] as const)(
		'redirects pending tasks and groups after %s work',
		(status) => {
			const original = task();
			const dependent = task({ dependsOn: [original.id] });
			const phase = group([], { dependsOn: [original.id] });
			const initial = prepare(plan(original, dependent, phase));
			const previous = prepare(setStatuses(initial, { [original.id]: status }), initial);
			const replacement = task({ fallbackFor: original.id });
			const proposal = { ...previous, items: [...previous.items, replacement] };
			const next = prepare(proposal, previous);
			expect(next.items[0]).toEqual(previous.items[0]);
			expect(next.items[1].dependsOn).toEqual([replacement.id]);
			expect(next.items[2].dependsOn).toEqual([replacement.id]);
			expect(proposal.items[1].dependsOn).toEqual([original.id]);
			expect(getAgentPlanReadiness(next).ready).toEqual([replacement.id]);
		},
	);

	it('supports replacement chains and deduplicates redirected dependencies', () => {
		const original = task();
		const dependent = task({ dependsOn: [original.id] });
		const initial = prepare(plan(original, dependent));
		const failed = prepare(setStatuses(initial, { [original.id]: 'failed' }), initial);
		const first = task({ fallbackFor: original.id });
		const firstPlan = prepare({ ...failed, items: [...failed.items, first] }, failed);
		const firstFailed = prepare(setStatuses(firstPlan, { [first.id]: 'failed' }), firstPlan);
		const second = task({ fallbackFor: first.id });
		const next = prepare(
			plan(
				firstFailed.items[0],
				{ ...dependent, dependsOn: [original.id, first.id, second.id] },
				firstFailed.items[2],
				second,
			),
			firstFailed,
		);
		expect(next.items[1].dependsOn).toEqual([second.id]);
		expect(next.items[2]).toEqual(firstFailed.items[2]);
	});

	it('finishes a group after a fallback succeeds without changing the failed task', () => {
		const original = task();
		const phase = group([original]);
		const initial = prepare(plan(phase));
		const failed = prepare(setStatuses(initial, { [original.id]: 'failed' }), initial);
		const failedGroup = failed.items[0] as AgentPlanGroup;
		const replacement = task({ fallbackFor: original.id });
		const replacing = prepare(
			plan({ ...failedGroup, tasks: [...failedGroup.tasks, replacement] }),
			failed,
		);
		const next = prepare(
			setStatuses(replacing, { [replacement.id]: 'done', [phase.id]: 'done' }),
			replacing,
		);
		expect(next.items[0].status).toBe('done');
		expect((next.items[0] as AgentPlanGroup).tasks[0]).toEqual(failedGroup.tasks[0]);
	});

	it('preserves cancelled dependents rather than redirecting historical work', () => {
		const original = task();
		const dependent = task({ dependsOn: [original.id] });
		const initial = prepare(plan(original, dependent));
		const previous = prepare(
			setStatuses(initial, { [original.id]: 'failed', [dependent.id]: 'cancelled' }),
			initial,
		);
		const next = prepare(
			{ ...previous, items: [...previous.items, task({ fallbackFor: original.id })] },
			previous,
		);
		expect(next.items[1]).toEqual(previous.items[1]);
	});

	it('rejects multiple replacements and cycles caused by redirection', () => {
		const original = task();
		const initial = prepare(plan(original));
		const previous = prepare(setStatuses(initial, { [original.id]: 'failed' }), initial);
		expect(() =>
			prepare(
				plan(
					previous.items[0],
					task({ fallbackFor: original.id }),
					task({ fallbackFor: original.id }),
				),
				previous,
			),
		).toThrow('one replacement');
		expect(() =>
			prepare(
				plan(previous.items[0], task({ fallbackFor: original.id, dependsOn: [original.id] })),
				previous,
			),
		).toThrow('same level');
	});

	it('rejects fallback cycles in stored documents', () => {
		const first = task({ status: 'failed' });
		const second = task({ status: 'failed', fallbackFor: first.id });
		first.fallbackFor = second.id;
		expect(() => getAgentPlanReadiness(plan(first, second))).toThrow('cycle');
		expect(() => getAgentPlanReadiness(plan(task({ ...first, fallbackFor: first.id })))).toThrow(
			'cycle',
		);
	});

	it('rejects missing, unfinished, non-task, and cross-group targets', () => {
		const original = task();
		const phase = group([]);
		for (const fallbackFor of [randomUUID(), original.id, phase.id]) {
			expect(() => prepare(plan(original, phase, task({ fallbackFor })))).toThrow(
				'Failed or Cancelled sibling',
			);
		}
		const initial = prepare(plan(original));
		const failed = prepare(setStatuses(initial, { [original.id]: 'failed' }), initial);
		expect(() =>
			prepare(plan(failed.items[0], group([task({ fallbackFor: original.id })])), failed),
		).toThrow('sibling');
	});
});
