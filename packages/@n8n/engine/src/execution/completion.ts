import type { WorkflowLoop } from '../graph';

/**
 * How many settled steps a finished execution owes, or `undefined` while a loop
 * the trigger reaches is still running.
 *
 * Without loops this is the reachable node count, one step per node. A loop
 * replaces its members' single steps with one per iteration.
 *
 * While a loop runs, how many steps it will create is not known, so there is no
 * total to give. That matters between two iterations, when every step so far has
 * settled: with a total, the execution would look finished when the next
 * iteration simply has not been planned yet.
 *
 * Only loops the trigger reaches count. The converter allows a loop component
 * nothing points into, and those never receive steps, so waiting on one would
 * hang the execution.
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

		// iterations 0 to t for the batch node, then t each for the rest: the body
		// has no step at the terminal iteration
		expected += terminal + 1 + terminal * (loop.memberIds.size - 1);
		for (const memberId of loop.memberIds) members.add(memberId);
	}

	for (const nodeId of reachable) {
		if (!members.has(nodeId)) expected += 1;
	}

	return expected;
}
