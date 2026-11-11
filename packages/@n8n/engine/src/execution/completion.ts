import type { WorkflowLoop } from '../graph';

/**
 * How many settled node-passes a finished execution owes, or `undefined` while
 * a loop the trigger reaches is still running. Node-passes, not steps: how many
 * runs a node-pass has depends on the data, but how many node-passes there are
 * depends only on the graph and on how many passes each loop took.
 *
 * `undefined` rather than a number, because between two passes every step so far
 * has settled. Any total would make the execution look finished when the next
 * pass simply has not been planned yet.
 *
 * A loop the trigger cannot reach is ignored, since it never receives steps and
 * waiting on it would hang the execution.
 */
export function countExpectedSettledSteps(
	loops: WorkflowLoop[],
	reachable: Set<string>,
	terminalIterations: Map<string, number>,
): number | undefined {
	let expected = 0;
	const members = new Set<string>();

	for (const loop of loops.filter((l) => reachable.has(l.batchNodeId))) {
		const terminal = terminalIterations.get(loop.batchNodeId);
		if (terminal === undefined) return undefined;

		// the body has no step at the last pass, hence t for members and t + 1 for
		// the batch node
		expected += terminal + 1 + terminal * (loop.memberIds.size - 1);
		for (const memberId of loop.memberIds) members.add(memberId);
	}

	for (const nodeId of reachable) {
		if (!members.has(nodeId)) expected += 1;
	}

	return expected;
}
