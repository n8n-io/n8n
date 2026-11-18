import { BUSY_WORKFLOW } from '../aquarium.constants';
import type { AquariumEntity } from '../aquarium.types';

/**
 * Workflows that are busy in absolute terms (`minExecutions`) and relative to the others (in the
 * busiest `busiestShare`). Run counts depend on the window of the source, so the share keeps the
 * result stable.
 */
export function busyWorkflowKeys(entities: AquariumEntity[]): Set<string> {
	const workflows = entities.filter((entity) => entity.kind === 'workflow');
	if (workflows.length === 0) return new Set();

	const counts = workflows.map((entity) => entity.metrics.executionCount).sort((a, b) => b - a);
	// At least one workflow can be busy, so a small tank can still have a penguin.
	const allowed = Math.max(1, Math.floor(workflows.length * BUSY_WORKFLOW.busiestShare));
	const cutoff = Math.max(BUSY_WORKFLOW.minExecutions, counts[allowed - 1] ?? 0);

	return new Set(
		workflows
			.filter((entity) => entity.metrics.executionCount >= cutoff)
			.map((entity) => entity.key),
	);
}
