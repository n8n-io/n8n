import type { ExecutionStatus } from 'n8n-workflow';
import type { GroupExecutionStatus, NodeExecutionSnapshot } from './canvas.types';

// Highest priority first. `success` is resolved separately.
const GROUP_STATUS_PRIORITY: readonly GroupExecutionStatus[] = [
	'waiting',
	'running',
	'error',
	'issues',
	'warning',
];

const IDLE_STATUSES: readonly ExecutionStatus[] = ['new', 'unknown', 'canceled'];

/**
 * Classify a single member for the group rollup by this priority:
 * waiting > running > error > issues > warning > success > idle.
 * Validation issues are kept distinct from execution errors.
 * Other is an active-but-unhandled status that must block a misleading success.
 * Idle statuses return undefined (they neither paint nor veto).
 */
function classifyNodeForGroup(
	snapshot: NodeExecutionSnapshot,
): GroupExecutionStatus | 'other' | undefined {
	const { status } = snapshot;
	if (snapshot.waiting || status === 'waiting') return 'waiting';
	if (snapshot.running || snapshot.waitingForNext) return 'running';
	if (snapshot.hasExecutionError) return 'error';
	if (snapshot.hasValidationError) return 'issues';
	if (snapshot.dirty) return 'warning';
	if (status === 'success') return 'success';
	if (status === undefined || IDLE_STATUSES.includes(status)) return undefined;
	return 'other';
}

/**
 * Reduce a set of per-node execution snapshots into one dominant status.
 * Shared between the canvas group title bar and the logs panel group row so
 * both surfaces always agree on what a group's status is.
 */
export function aggregateGroupExecutionFromSnapshots(
	snapshots: NodeExecutionSnapshot[],
): GroupExecutionStatus | undefined {
	const seen = new Set<GroupExecutionStatus | 'other' | undefined>();
	for (const snapshot of snapshots) {
		seen.add(classifyNodeForGroup(snapshot));
	}

	for (const status of GROUP_STATUS_PRIORITY) {
		if (seen.has(status)) return status;
	}
	// success is the only status that speaks for every member
	return seen.has('success') && !seen.has('other') ? 'success' : undefined;
}

/** Reduce a group's per-node state into one dominant status. */
export function aggregateGroupExecution(
	nodeIds: string[],
	getNodeExecutionSnapshot: (id: string) => NodeExecutionSnapshot,
): GroupExecutionStatus | undefined {
	return aggregateGroupExecutionFromSnapshots(nodeIds.map(getNodeExecutionSnapshot));
}
