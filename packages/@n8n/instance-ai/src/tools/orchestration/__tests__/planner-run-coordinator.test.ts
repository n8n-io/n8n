import type { Mock } from 'vitest';

import type {
	OrchestrationContext,
	PlannedTaskGraph,
	PlannedTaskRecord,
	PlannedTaskService,
} from '../../../types';
import { BlueprintAccumulator } from '../blueprint-accumulator';
import { clearPlannedTaskGraph, rehydrateAccumulatorFromGraph } from '../planner-run-coordinator';

function makeContext(overrides: {
	graph: PlannedTaskGraph | null;
	runId?: string;
}): {
	context: OrchestrationContext;
	clear: Mock;
	getGraph: Mock;
} {
	const clear = vi.fn(async () => {
		await Promise.resolve();
	});
	const getGraph = vi.fn(async () => {
		await Promise.resolve();
		return overrides.graph;
	});
	const plannedTaskService: Partial<PlannedTaskService> = {
		getGraph,
		clear,
	};
	const context = {
		threadId: 't-1',
		runId: overrides.runId ?? 'run-current',
		plannedTaskService: plannedTaskService as PlannedTaskService,
	} as unknown as OrchestrationContext;
	return { context, clear, getGraph };
}

describe('clearPlannedTaskGraph', () => {
	it('clears the graph when it belongs to this run and is awaiting approval', async () => {
		const { context, clear } = makeContext({
			graph: {
				planRunId: 'run-current',
				status: 'awaiting_approval',
				tasks: [],
			},
		});

		await clearPlannedTaskGraph(context);

		expect(clear).toHaveBeenCalledWith('t-1');
	});

	it('does not clear an active graph from a prior approved plan', async () => {
		// A previous `/plan` call already succeeded; its graph is `active` with
		// pending checkpoints. A new planner error must not wipe it.
		const { context, clear } = makeContext({
			graph: {
				planRunId: 'run-previous',
				status: 'active',
				tasks: [],
			},
		});

		await clearPlannedTaskGraph(context);

		expect(clear).not.toHaveBeenCalled();
	});

	it('does not clear an awaiting-approval graph that was created by a different planner run', async () => {
		// Defensive: a concurrent plan for a different run should not have its
		// unapproved graph wiped by this run's error-path cleanup.
		const { context, clear } = makeContext({
			graph: {
				planRunId: 'run-other',
				status: 'awaiting_approval',
				tasks: [],
			},
		});

		await clearPlannedTaskGraph(context);

		expect(clear).not.toHaveBeenCalled();
	});

	it('is a no-op when no graph exists', async () => {
		const { context, clear, getGraph } = makeContext({ graph: null });

		await clearPlannedTaskGraph(context);

		expect(getGraph).toHaveBeenCalled();
		expect(clear).not.toHaveBeenCalled();
	});

	it('swallows getGraph errors so the caller can return its own error', async () => {
		const { context, getGraph } = makeContext({
			graph: { planRunId: 'run-current', status: 'awaiting_approval', tasks: [] },
		});
		getGraph.mockRejectedValueOnce(new Error('db down'));

		await expect(clearPlannedTaskGraph(context)).resolves.toBeUndefined();
	});
});

describe('rehydrateAccumulatorFromGraph (resume revision flow)', () => {
	const persistedTasks: PlannedTaskRecord[] = [
		{
			id: 'wf-1',
			title: "Build 'A' workflow",
			kind: 'build-workflow',
			spec: 'A',
			deps: [],
			status: 'planned',
		},
		{
			id: 'wf-2',
			title: "Build 'B' workflow",
			kind: 'build-workflow',
			spec: 'B',
			deps: [],
			status: 'planned',
		},
	];

	it('seeds the accumulator from an awaiting-approval graph so a revision keeps originals', async () => {
		// Reproduces "ask for edits -> revise existing plan -> submit again":
		// on resume the parent rebuilt a fresh accumulator; without rehydration
		// the planner's remove/add would operate on an empty plan and the
		// re-submit would drop every original item.
		const { context } = makeContext({
			graph: { planRunId: 'run-current', status: 'awaiting_approval', tasks: persistedTasks },
		});
		const accumulator = new BlueprintAccumulator();

		await rehydrateAccumulatorFromGraph(context, accumulator);

		// Planner revises: drop one original, add a new one, then resubmits.
		expect(accumulator.removeItem('wf-2')).toBe(true);
		accumulator.addItem({
			kind: 'workflow',
			id: 'wf-3',
			name: 'C',
			purpose: 'C',
			integrations: [],
			dependsOn: [],
		});

		expect(accumulator.getTaskList().map((t) => t.id)).toEqual(['wf-1', 'wf-3']);
	});

	it('does not reopen an already-approved/active graph', async () => {
		const { context } = makeContext({
			graph: { planRunId: 'run-current', status: 'active', tasks: persistedTasks },
		});
		const accumulator = new BlueprintAccumulator();

		await rehydrateAccumulatorFromGraph(context, accumulator);

		expect(accumulator.isEmpty()).toBe(true);
	});

	it('is a no-op when no graph exists', async () => {
		const { context, getGraph } = makeContext({ graph: null });
		const accumulator = new BlueprintAccumulator();

		await rehydrateAccumulatorFromGraph(context, accumulator);

		expect(getGraph).toHaveBeenCalledWith('t-1');
		expect(accumulator.isEmpty()).toBe(true);
	});

	it('leaves the accumulator empty when getGraph throws', async () => {
		const { context, getGraph } = makeContext({
			graph: { planRunId: 'run-current', status: 'awaiting_approval', tasks: persistedTasks },
		});
		getGraph.mockRejectedValueOnce(new Error('db down'));
		const accumulator = new BlueprintAccumulator();

		await expect(rehydrateAccumulatorFromGraph(context, accumulator)).resolves.toBeUndefined();
		expect(accumulator.isEmpty()).toBe(true);
	});
});
