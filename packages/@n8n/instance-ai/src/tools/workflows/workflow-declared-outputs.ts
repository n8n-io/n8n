import type { WorkflowJSON } from '@n8n/workflow-sdk';

/**
 * Verification fixtures a workflow's source declared as node `output`, keyed by
 * node name. The saved workflow does not store them (they are source-only, see
 * `declaredOutputFixtures` on the compile result), so once a build lands they
 * survive only here, on the file binding. `nodeType` guards re-emission: a
 * fixture describes one node's shape, and a node that changed type outside the
 * conversation should not inherit it.
 */
export type DeclaredOutputFixtures = Record<
	string,
	{ nodeType: string; items: Array<Record<string, unknown>> }
>;

/** Thread metadata is read on every turn, so a fixture set that would bloat it is dropped instead. */
export const MAX_DECLARED_OUTPUT_FIXTURES_CHARS = 32_000;

type Nodes = WorkflowJSON['nodes'];

function nodeTypesByName(nodes: Nodes | undefined): Map<string, string> {
	const byName = new Map<string, string>();
	for (const node of nodes ?? []) {
		if (node.name && node.type) byName.set(node.name, node.type);
	}
	return byName;
}

/**
 * The fixtures to keep on the binding after a successful build, or undefined
 * when there are none worth keeping (no declared output, or too large).
 */
export function declaredOutputFixturesForBinding(
	declared: NonNullable<WorkflowJSON['pinData']> | undefined,
	nodes: Nodes | undefined,
): DeclaredOutputFixtures | undefined {
	if (!declared) return undefined;
	const types = nodeTypesByName(nodes);
	const kept: DeclaredOutputFixtures = {};
	for (const [nodeName, items] of Object.entries(declared)) {
		const nodeType = types.get(nodeName);
		if (!nodeType || !Array.isArray(items) || items.length === 0) continue;
		kept[nodeName] = { nodeType, items };
	}
	if (Object.keys(kept).length === 0) return undefined;
	if (JSON.stringify(kept).length > MAX_DECLARED_OUTPUT_FIXTURES_CHARS) return undefined;
	return kept;
}

/**
 * Fixtures to re-emit when source is regenerated from the saved workflow: only
 * for nodes that still exist under the same name and type. Later entries win
 * when several bindings carry fixtures for the same node.
 */
export function nodeOutputsForRegeneration(
	fixtureSets: Array<DeclaredOutputFixtures | undefined>,
	nodes: Nodes | undefined,
): Record<string, unknown[]> | undefined {
	const types = nodeTypesByName(nodes);
	const outputs: Record<string, unknown[]> = {};
	for (const fixtures of fixtureSets) {
		for (const [nodeName, fixture] of Object.entries(fixtures ?? {})) {
			if (types.get(nodeName) !== fixture.nodeType) continue;
			outputs[nodeName] = fixture.items;
		}
	}
	return Object.keys(outputs).length > 0 ? outputs : undefined;
}
