/**
 * Shared connection traversal helpers for validator plugins.
 *
 * Graph connections are only fully populated after the toJSON merge, so every
 * lookup also consults instance-level `.to()` declarations, which is what
 * `wf.validate()` sees before `mergeInstanceConnections` runs.
 */

import { isNodeChain, type GraphNode } from '../../../types/base';

export function resolveTargetNodeName(target: unknown): string | undefined {
	if (!target) return undefined;
	if (
		typeof target === 'object' &&
		'node' in target &&
		typeof (target as { node: unknown }).node === 'object'
	) {
		return (target as { node: { name?: string } }).node?.name;
	}
	if (isNodeChain(target)) {
		return target.head.name;
	}
	if (typeof target === 'object' && 'name' in target) {
		return (target as { name: string }).name;
	}
	return undefined;
}

/** Node names this node connects to on `main`, optionally restricted to one output index. */
export function mainSuccessors(graphNode: GraphNode, outputIndex?: number): string[] {
	const names: string[] = [];

	const mainConns = graphNode.connections.get('main');
	if (mainConns) {
		for (const [index, targets] of mainConns) {
			if (outputIndex !== undefined && index !== outputIndex) continue;
			for (const target of targets) {
				names.push(target.node);
			}
		}
	}

	if (typeof graphNode.instance.getConnections === 'function') {
		for (const conn of graphNode.instance.getConnections()) {
			if (conn.connectionType !== undefined && conn.connectionType !== 'main') continue;
			const index = conn.outputIndex ?? 0;
			if (outputIndex !== undefined && index !== outputIndex) continue;
			const name = resolveTargetNodeName(conn.target);
			if (name) names.push(name);
		}
	}

	return [...new Set(names)];
}

/** Node names that feed this node's `main` input. */
export function mainInputSources(
	targetName: string,
	nodes: ReadonlyMap<string, GraphNode>,
): string[] {
	const sources: string[] = [];
	for (const [sourceName, graphNode] of nodes) {
		if (mainSuccessors(graphNode).includes(targetName)) {
			sources.push(sourceName);
		}
	}
	return [...new Set(sources)];
}

export interface UpstreamSearchOptions {
	/** Hops to search before giving up. */
	readonly maxHops?: number;
	/** Only keep walking past a non-matching node when this holds. */
	readonly traverseThrough?: (graphNode: GraphNode) => boolean;
}

/** Breadth-first walk over upstream `main` nodes, nearest first. */
export function findUpstream(
	targetName: string,
	nodes: ReadonlyMap<string, GraphNode>,
	predicate: (name: string, graphNode: GraphNode) => boolean,
	options: UpstreamSearchOptions = {},
): string | undefined {
	const { maxHops = Number.POSITIVE_INFINITY, traverseThrough } = options;
	const visited = new Set<string>([targetName]);
	const queue = mainInputSources(targetName, nodes).map((name) => ({ name, hop: 1 }));

	while (queue.length > 0) {
		const entry = queue.shift();
		if (!entry || visited.has(entry.name) || entry.hop > maxHops) continue;
		visited.add(entry.name);

		const graphNode = nodes.get(entry.name);
		if (!graphNode) continue;
		if (predicate(entry.name, graphNode)) return entry.name;
		if (traverseThrough && !traverseThrough(graphNode)) continue;

		queue.push(
			...mainInputSources(entry.name, nodes).map((name) => ({ name, hop: entry.hop + 1 })),
		);
	}

	return undefined;
}

/**
 * Breadth-first walk over downstream `main` nodes.
 *
 * `visit` returns `'stop'` to prune the branch (e.g. an unwrap node ends the
 * search) or `'match'` to end the whole walk.
 */
export function walkDownstream(
	startNames: readonly string[],
	nodes: ReadonlyMap<string, GraphNode>,
	visit: (name: string, graphNode: GraphNode) => 'match' | 'stop' | 'continue',
): string | undefined {
	const visited = new Set<string>();
	const queue = [...startNames];

	while (queue.length > 0) {
		const name = queue.shift();
		if (!name || visited.has(name)) continue;
		visited.add(name);

		const graphNode = nodes.get(name);
		if (!graphNode) continue;

		const verdict = visit(name, graphNode);
		if (verdict === 'match') return name;
		if (verdict === 'stop') continue;

		queue.push(...mainSuccessors(graphNode));
	}

	return undefined;
}
