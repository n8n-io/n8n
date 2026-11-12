import type { SelfHealingResultWorkflowCall } from '@n8n/api-types';
import sortBy from 'lodash/sortBy';
import uniqBy from 'lodash/uniqBy';

export type WorkflowHierarchy = {
	workflowIds: string[];
	calls: SelfHealingResultWorkflowCall[];
};

export function pruneWorkflowHierarchy(
	triggeringWorkflowId: string,
	calls: SelfHealingResultWorkflowCall[],
	changedWorkflowIds: ReadonlySet<string>,
): WorkflowHierarchy {
	const callees = new Map<string, Set<string>>();
	const callers = new Map<string, Set<string>>();
	for (const { callerWorkflowId, calledWorkflowId } of calls) {
		addTo(callees, callerWorkflowId, calledWorkflowId);
		addTo(callers, calledWorkflowId, callerWorkflowId);
	}

	const distance = new Map([[triggeringWorkflowId, 0]]);
	for (const [workflowId, depth] of distance) {
		for (const called of callees.get(workflowId) ?? []) {
			if (!distance.has(called)) distance.set(called, depth + 1);
		}
	}

	const reachesChange = new Set(changedWorkflowIds);
	for (const workflowId of reachesChange) {
		for (const caller of callers.get(workflowId) ?? []) reachesChange.add(caller);
	}

	const kept = new Set([triggeringWorkflowId, ...changedWorkflowIds]);
	for (const workflowId of distance.keys()) {
		if (reachesChange.has(workflowId)) kept.add(workflowId);
	}

	const workflowIds = sortBy(
		[...kept],
		[(workflowId) => distance.get(workflowId) ?? Infinity, (workflowId) => workflowId],
	);
	const position = new Map(workflowIds.map((workflowId, index) => [workflowId, index]));
	const keptCalls = uniqBy(
		calls.filter(
			({ callerWorkflowId, calledWorkflowId }) =>
				kept.has(callerWorkflowId) && kept.has(calledWorkflowId),
		),
		({ callerWorkflowId, calledWorkflowId }) => `${callerWorkflowId}:${calledWorkflowId}`,
	);

	return {
		workflowIds,
		calls: sortBy(keptCalls, [
			({ callerWorkflowId }) => position.get(callerWorkflowId),
			({ calledWorkflowId }) => position.get(calledWorkflowId),
		]),
	};
}

function addTo(map: Map<string, Set<string>>, key: string, value: string) {
	const values = map.get(key) ?? new Set<string>();
	values.add(value);
	map.set(key, values);
}
