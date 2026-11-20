import type { WorkflowData } from '../types';

// Cache shallow host bindings by default.
const DEFAULT_CACHED_PATH_DEPTH = 2;

/** A cached path prefix and its resolved host value. */
interface CachedPathNode {
	readonly value: unknown;
	children?: Map<string, CachedPathNode>;
}

/**
 * Resolve host paths for one execute() call.
 * Reuse cached prefixes so array reads do not evaluate `$parameter.ids` again.
 */
export class HostDataResolver {
	private data?: WorkflowData;

	private pathCacheRoot?: CachedPathNode;

	constructor(data: WorkflowData) {
		this.data = data;
	}

	getData(): WorkflowData {
		if (!this.data) {
			throw new Error('Host callback called after its expression finished');
		}
		return this.data;
	}

	/** Return the value at the path, or the first null or undefined on it. */
	resolve(path: readonly string[]): unknown {
		let node = (this.pathCacheRoot ??= { value: this.getData() });
		const cacheDepth = getCachedPathDepth(path);
		for (
			let depth = 0;
			depth < path.length && node.value !== undefined && node.value !== null;
			depth++
		) {
			const key = path[depth];
			let child = node.children?.get(key);
			if (!child) {
				child = { value: readStep(node.value, key, depth === 1 ? path[0] : undefined) };
				// Skip deeper steps and primitive leaves to limit the size of the cache.
				if (depth < cacheDepth && (depth < path.length - 1 || hasProperties(child.value))) {
					// Keep only the last item proxy during iteration.
					if (depth === 1 && path[0] === '$item') {
						node.children?.clear();
					}
					(node.children ??= new Map()).set(key, child);
				}
			}
			node = child;
		}
		return node.value;
	}

	/** Release all host references when the execute() call ends. */
	dispose(): void {
		this.data = undefined;
		this.pathCacheRoot = undefined;
	}
}

/** Cache through parameter values, which can require a nested expression evaluation. */
function getCachedPathDepth(path: readonly string[]): number {
	const rootDepth = path[0] === '$item' ? 2 : 0;
	if (path[rootDepth] === '$parameter') {
		return rootDepth + 2;
	}
	if (path[rootDepth] === '$node' && path[rootDepth + 2] === 'parameter') {
		return rootDepth + 4;
	}
	return DEFAULT_CACHED_PATH_DEPTH;
}

/** Call `$item(index)` or `$(nodeName)` at the second step. Read properties elsewhere. */
function readStep(parent: unknown, key: string, root: string | undefined): unknown {
	if (typeof parent === 'function' && root === '$') {
		return (parent as (nodeName: string) => unknown)(key);
	}
	if (typeof parent === 'function' && root === '$item') {
		const itemIndex = parseInt(key, 10);
		if (!isNaN(itemIndex)) {
			return (parent as (index: number) => unknown)(itemIndex);
		}
	}
	return (parent as Record<string, unknown>)[key];
}

function hasProperties(value: unknown): boolean {
	return (typeof value === 'object' && value !== null) || typeof value === 'function';
}
