import type { InstanceAiToolCallState, PlannedTaskArg, TaskList } from '@n8n/api-types';

/** Map the simplified task checklist to the richer planned-task shape. */
function mapTaskItemsToPlannedTasks(tasks?: TaskList): PlannedTaskArg[] | undefined {
	if (!tasks?.tasks?.length) return undefined;
	return tasks.tasks.map((t) => ({
		id: t.id,
		title: t.description,
		kind: '',
		spec: '',
		deps: [],
	}));
}

/**
 * Resolve the planned tasks a plan-review card is about.
 *
 * The `create-tasks` suspend payload carries `tasks` only, so `planItems` is
 * empty on a live card and `args.tasks` is the real source. Keep all three
 * sources in one place — a count taken from `planItems` alone reports zero.
 */
export function resolvePlanTasks(tc: InstanceAiToolCallState): PlannedTaskArg[] {
	return (
		tc.confirmation?.planItems ??
		(tc.args?.tasks as PlannedTaskArg[] | undefined) ??
		mapTaskItemsToPlannedTasks(tc.confirmation?.tasks) ??
		[]
	);
}
