import type { DependencyEdge, DependencyGraphResponse, DependencyNode } from '@n8n/api-types';

export interface AffinityCell {
	a: string;
	b: string;
	shared: number;
	jaccard: number;
}

export interface AffinityMatrix {
	workflows: DependencyNode[];
	cells: AffinityCell[];
	max: number;
}

export interface ProjectFlow {
	source: string;
	target: string;
	value: number;
}

/**
 * Workflow × workflow affinity from shared credentials and data tables.
 *
 * Two workflows are "close" when they reach for the same external resources.
 * Score is the Jaccard index of their shared (cred + dataTable) sets so it's
 * normalized regardless of how many resources each workflow uses.
 *
 * Workflows with zero shared resources are dropped so the heatmap stays dense.
 */
export function buildWorkflowAffinity(graph: DependencyGraphResponse): AffinityMatrix {
	const usage = new Map<string, Set<string>>();
	const isResource = (kind: DependencyNode['kind']) =>
		kind === 'credential' || kind === 'dataTable';
	const nodeKind = new Map<string, DependencyNode['kind']>();
	for (const node of graph.nodes) nodeKind.set(node.id, node.kind);

	for (const edge of graph.edges) {
		const targetKind = nodeKind.get(edge.target);
		if (!targetKind || !isResource(targetKind)) continue;
		let set = usage.get(edge.source);
		if (!set) {
			set = new Set();
			usage.set(edge.source, set);
		}
		set.add(edge.target);
	}

	const workflows = graph.nodes.filter((n) => n.kind === 'workflow' && usage.has(n.id));
	const cells: AffinityCell[] = [];
	let max = 0;
	for (let i = 0; i < workflows.length; i++) {
		const a = workflows[i];
		const setA = usage.get(a.id)!;
		for (let j = i + 1; j < workflows.length; j++) {
			const b = workflows[j];
			const setB = usage.get(b.id)!;
			let shared = 0;
			for (const id of setA) if (setB.has(id)) shared++;
			if (shared === 0) continue;
			const union = setA.size + setB.size - shared;
			const jaccard = union === 0 ? 0 : shared / union;
			cells.push({ a: a.id, b: b.id, shared, jaccard });
			if (shared > max) max = shared;
		}
	}

	const linked = new Set<string>();
	for (const cell of cells) {
		linked.add(cell.a);
		linked.add(cell.b);
	}
	const filtered = workflows.filter((w) => linked.has(w.id));

	return { workflows: filtered, cells, max };
}

/**
 * Per-project shared resources — how often a workflow in project A calls /
 * uses something owned by project B. Self-loops are skipped: this is about
 * cross-project coupling, not internal density.
 */
export function buildProjectFlows(graph: DependencyGraphResponse): {
	flows: ProjectFlow[];
	projects: string[];
} {
	const projectOf = new Map<string, string | undefined>();
	for (const node of graph.nodes) projectOf.set(node.id, node.projectId);

	const counter = new Map<string, number>();
	for (const edge of graph.edges) {
		const src = projectOf.get(edge.source);
		const tgt = projectOf.get(edge.target);
		if (!src || !tgt || src === tgt) continue;
		const key = `${src}${tgt}`;
		counter.set(key, (counter.get(key) ?? 0) + 1);
	}

	const flows: ProjectFlow[] = [];
	const projectSet = new Set<string>();
	for (const [key, value] of counter) {
		const [source, target] = key.split('');
		flows.push({ source, target, value });
		projectSet.add(source);
		projectSet.add(target);
	}

	return { flows, projects: [...projectSet].sort() };
}

export function edgeColor(kind: DependencyEdge['kind']): string {
	switch (kind) {
		case 'workflowCall':
			return '#3b82f6';
		case 'errorWorkflow':
			return '#ef4444';
		case 'credentialId':
			return '#10b981';
		case 'dataTableId':
			return '#f59e0b';
	}
}

export function nodeColor(node: DependencyNode): string {
	if (node.restricted) return '#9ca3af';
	switch (node.kind) {
		case 'workflow':
			return '#3b82f6';
		case 'credential':
			return '#10b981';
		case 'dataTable':
			return '#f59e0b';
	}
}

export function nodeRadius(node: DependencyNode, fanout: number): number {
	const base = node.kind === 'workflow' ? 6 : 5;
	return base + Math.min(10, Math.sqrt(fanout) * 1.5);
}

/**
 * Label-propagation community detection.
 *
 * Treats the dependency graph as undirected and propagates labels until
 * convergence: in each pass every node adopts the most common label among
 * its neighbours, breaking ties deterministically by smaller label id so
 * results are stable across reloads.
 *
 * Good-enough modularity for the scale of n8n dependency graphs (<10k
 * nodes), and avoids pulling in graphology. For very dense communities a
 * Louvain pass would do better — easy upgrade path later.
 */
export function detectCommunities(graph: DependencyGraphResponse): Map<string, number> {
	const neighbours = new Map<string, Set<string>>();
	for (const node of graph.nodes) neighbours.set(node.id, new Set());
	for (const edge of graph.edges) {
		neighbours.get(edge.source)?.add(edge.target);
		neighbours.get(edge.target)?.add(edge.source);
	}

	const ids = [...neighbours.keys()].sort();
	const label = new Map<string, number>();
	ids.forEach((id, i) => label.set(id, i));

	const maxIterations = 20;
	for (let iter = 0; iter < maxIterations; iter++) {
		let changed = false;
		for (const id of ids) {
			const nbrs = neighbours.get(id);
			if (!nbrs || nbrs.size === 0) continue;
			const counts = new Map<number, number>();
			for (const nbr of nbrs) {
				const lbl = label.get(nbr);
				if (lbl === undefined) continue;
				counts.set(lbl, (counts.get(lbl) ?? 0) + 1);
			}
			let bestLabel = label.get(id)!;
			let bestCount = counts.get(bestLabel) ?? 0;
			for (const [lbl, count] of counts) {
				if (count > bestCount || (count === bestCount && lbl < bestLabel)) {
					bestCount = count;
					bestLabel = lbl;
				}
			}
			if (bestLabel !== label.get(id)) {
				label.set(id, bestLabel);
				changed = true;
			}
		}
		if (!changed) break;
	}

	// Renumber communities to be contiguous and ordered by size (largest = 0)
	const sizes = new Map<number, number>();
	for (const lbl of label.values()) sizes.set(lbl, (sizes.get(lbl) ?? 0) + 1);
	const sortedLabels = [...sizes.entries()].sort((a, b) => b[1] - a[1]).map(([lbl]) => lbl);
	const renumber = new Map<number, number>();
	sortedLabels.forEach((lbl, i) => renumber.set(lbl, i));

	const result = new Map<string, number>();
	for (const [id, lbl] of label) result.set(id, renumber.get(lbl)!);
	return result;
}
