export type NodeIdentity = { id?: string; name: string };

export type ResolvedNodeReference = {
	/** Undefined for a new node that has no id in the JSON yet. */
	id?: string;
	name: string;
	/** Set when the reference uses the name the node had before this edit. */
	renamedFrom?: string;
};

export type NodeNameResolver = (name: string) => ResolvedNodeReference | undefined;

/**
 * Resolves node names used in `connections` and `pinData` keys.
 * A current name wins. A name that a node had when editing started still
 * resolves to that node after a rename, so editing only `nodes[i].name` is enough.
 */
export function createNodeNameResolver(
	nodes: NodeIdentity[],
	baseNodes: Array<{ id: string; name: string }>,
): NodeNameResolver {
	const byName = new Map(nodes.map((node) => [node.name, node]));
	const byId = new Map(nodes.filter((node) => node.id).map((node) => [node.id, node]));
	const baseIdByName = new Map(baseNodes.map((node) => [node.name, node.id]));

	return (name) => {
		const current = byName.get(name);
		if (current) return { id: current.id, name: current.name };

		const baseId = baseIdByName.get(name);
		const renamed = baseId ? byId.get(baseId) : undefined;
		return renamed ? { id: renamed.id, name: renamed.name, renamedFrom: name } : undefined;
	};
}
