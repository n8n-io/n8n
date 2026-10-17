import type { NodeTypesProvider } from './types';

/**
 * Wraps a node-type provider so a type or version the instance cannot resolve
 * returns `undefined` instead of throwing.
 *
 * Every provider-backed validator null-checks its lookup, and a validator that
 * reports nothing is better than one that fails the whole validation pass. A
 * node pinned to a version the instance no longer has, after a stale import or
 * a downgrade, would otherwise escape as an opaque crash. `validateWorkflow`
 * reports that node separately as `UNKNOWN_NODE_VERSION`.
 */
export function safeNodeTypesProvider(provider: NodeTypesProvider): NodeTypesProvider {
	return {
		getByNameAndVersion: (type, version) => {
			try {
				return provider.getByNameAndVersion(type, version);
			} catch {
				return undefined;
			}
		},
	};
}
