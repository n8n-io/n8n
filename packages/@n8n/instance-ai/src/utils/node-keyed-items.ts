/**
 * Lookups into maps keyed by workflow node name (pin data, simulation
 * fixtures, declared outputs).
 *
 * Node names are free-form user text, so a name can collide with a property
 * that every plain object already inherits. A bare `map[nodeName]` then
 * returns that inherited value instead of `undefined`, and the caller ends up
 * treating it as an item list.
 */

/** One node's items, or `undefined` when the map holds no entry of its own. */
export function itemsForNode<T>(
	map: Record<string, T[]> | undefined,
	nodeName: string,
): T[] | undefined {
	if (!map || !Object.hasOwn(map, nodeName)) return undefined;
	const items = map[nodeName];
	return Array.isArray(items) ? items : undefined;
}
