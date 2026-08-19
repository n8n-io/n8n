import type { WorkflowLoop } from '../graph';

/**
 * How many settled rows a finished execution owes, or `undefined` while a loop
 * the trigger reaches is still running.
 *
 * Without loops this is the reachable node count, one row per node. A loop
 * replaces its members' single rows with a row per iteration.
 *
 * While a loop runs, how many rows it will write is not known, so there is no
 * total to give. That matters between two iterations, when every row so far has
 * settled: with a total, the execution would look finished when the next
 * iteration simply has not been planned yet.
 *
 * Only loops the trigger reaches count. The converter allows a loop component
 * nothing points into, and those never receive rows, so waiting on one would
 * hang the execution.
 */
export function expectedSettledRows(
	loops: WorkflowLoop[],
	reachable: Set<string>,
	terminalIterations: Map<string, number>,
): number | undefined {
	let expected = 0;
	const members = new Set<string>();

	for (const loop of loops.filter((l) => reachable.has(l.batchNodeId))) {
		const terminal = terminalIterations.get(loop.batchNodeId);
		if (terminal === undefined) return undefined;

		// rows 0 to t for the batch node, then t each for the rest: the body has no
		// row at the terminal iteration
		expected += terminal + 1 + terminal * (loop.memberIds.size - 1);
		for (const memberId of loop.memberIds) members.add(memberId);
	}

	for (const nodeId of reachable) {
		if (!members.has(nodeId)) expected += 1;
	}

	return expected;
}
