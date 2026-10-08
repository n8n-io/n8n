/**
 * Picks the sole "real" node from a list of upstream parents, ignoring any
 * Evaluation Trigger among them — a pre-existing Evaluation Trigger can
 * converge on the same node as a workflow's real trigger (added to enable
 * evaluation without disturbing production), and shouldn't count towards
 * ambiguity. Falls back to the Evaluation Trigger itself when it's the only
 * parent (a workflow built entirely around evaluation, TRUST-407).
 *
 * Shared by every call site that walks the graph to find "the node feeding
 * this point" — the config wizard's slice resolution and the input-preview
 * readers (`useSliceInputs`, `ExecutionRow`) alike — so a converging
 * Evaluation Trigger can't cause one of them to pick a different (or no)
 * upstream node than the others.
 */
export function resolveSingleUpstream(
	parents: string[],
	evaluationTriggerNames: { has(name: string): boolean },
): string | undefined {
	const nonEvalParents = parents.filter((p) => !evaluationTriggerNames.has(p));
	if (nonEvalParents.length === 1) return nonEvalParents[0];
	if (nonEvalParents.length === 0 && parents.length === 1) return parents[0];
	return undefined;
}
