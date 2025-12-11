import type { NodeConfigurationsMap } from '../types/tools';

/**
 * Reducer for appending arrays with null/empty check.
 * Only appends if the update is a non-empty array.
 */
export function appendArrayReducer<T>(current: T[], update: T[] | undefined | null): T[] {
	return update && update.length > 0 ? [...current, ...update] : current;
}

/**
 * Merge node configurations by type, appending new configs to existing ones.
 * Used as a standalone utility function for merging node configurations outside of reducers.
 */
export function mergeNodeConfigurations(
	target: NodeConfigurationsMap,
	source: NodeConfigurationsMap,
): void {
	for (const [nodeType, configs] of Object.entries(source)) {
		if (!target[nodeType]) {
			target[nodeType] = [];
		}
		target[nodeType].push(...configs);
	}
}

/**
 * Reducer for merging node configurations by type.
 * Appends new configurations to existing ones for each node type.
 */
export function nodeConfigurationsReducer(
	current: NodeConfigurationsMap,
	update: NodeConfigurationsMap | undefined | null,
): NodeConfigurationsMap {
	if (!update || Object.keys(update).length === 0) {
		return current;
	}
	const merged = { ...current };
	mergeNodeConfigurations(merged, update);
	return merged;
}
