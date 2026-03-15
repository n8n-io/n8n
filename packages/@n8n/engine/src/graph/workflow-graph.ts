import { createHash } from 'node:crypto';

import type { WorkflowGraphData, GraphNodeData, GraphEdgeData } from './graph.types';

function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex').substring(0, 12);
}

export class WorkflowGraph {
	constructor(private data: WorkflowGraphData) {
		this.validate();
	}

	/**
	 * Validate that the workflow graph is a DAG (contains no cycles).
	 * Uses Kahn's algorithm (topological sort via in-degree reduction).
	 * Throws an error describing the cycle path if one is detected.
	 */
	validate(): void {
		const nodeIds = new Set(this.data.nodes.map((n) => n.id));
		const inDegree = new Map<string, number>();
		const adjacency = new Map<string, string[]>();

		for (const id of nodeIds) {
			inDegree.set(id, 0);
			adjacency.set(id, []);
		}

		for (const edge of this.data.edges) {
			if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
			adjacency.get(edge.from)!.push(edge.to);
			inDegree.set(edge.to, inDegree.get(edge.to)! + 1);
		}

		// Kahn's algorithm: start with all nodes that have in-degree 0
		const queue: string[] = [];
		for (const [id, degree] of inDegree) {
			if (degree === 0) queue.push(id);
		}

		let visited = 0;
		while (queue.length > 0) {
			const current = queue.shift()!;
			visited++;
			for (const neighbor of adjacency.get(current)!) {
				const newDegree = inDegree.get(neighbor)! - 1;
				inDegree.set(neighbor, newDegree);
				if (newDegree === 0) queue.push(neighbor);
			}
		}

		if (visited < nodeIds.size) {
			// There is a cycle — find it by following nodes still with in-degree > 0
			const cyclePath = this.findCyclePath(adjacency, inDegree);
			const nodeNames = cyclePath.map((id) => {
				const node = this.data.nodes.find((n) => n.id === id);
				return node ? `${node.name} (${id})` : id;
			});
			throw new Error(`Workflow graph contains a cycle: ${nodeNames.join(' -> ')}`);
		}
	}

	/**
	 * Trace a cycle among the nodes that still have in-degree > 0 after
	 * Kahn's algorithm. Returns the cycle as a list of node IDs ending
	 * with the first ID repeated (e.g. [A, B, C, A]).
	 */
	private findCyclePath(adjacency: Map<string, string[]>, inDegree: Map<string, number>): string[] {
		// Pick any node still in the cycle (in-degree > 0)
		let start: string | undefined;
		for (const [id, degree] of inDegree) {
			if (degree > 0) {
				start = id;
				break;
			}
		}
		if (!start) return [];

		// Follow edges among cycle-participant nodes to trace the cycle
		const visited = new Set<string>();
		const path: string[] = [];
		let current: string | undefined = start;

		while (current && !visited.has(current)) {
			visited.add(current);
			path.push(current);
			// Follow to a neighbor that is also in the cycle (in-degree > 0)
			current = adjacency.get(current)?.find((n) => inDegree.get(n)! > 0);
		}

		if (current) {
			// Trim the path so it starts at the cycle entry point
			const cycleStart = path.indexOf(current);
			const cycle = path.slice(cycleStart);
			cycle.push(current); // close the loop
			return cycle;
		}

		return path;
	}

	getTriggerNode(): GraphNodeData {
		const trigger = this.data.nodes.find((n) => n.type === 'trigger');
		if (!trigger) throw new Error('No trigger node found in graph');
		return trigger;
	}

	getNode(stepId: string): GraphNodeData | undefined {
		return this.data.nodes.find((n) => n.id === stepId);
	}

	getNodeOrFail(stepId: string): GraphNodeData {
		const node = this.getNode(stepId);
		if (!node) throw new Error(`Node not found: ${stepId}`);
		return node;
	}

	getPredecessors(stepId: string): GraphNodeData[] {
		const predIds = this.data.edges.filter((e) => e.to === stepId).map((e) => e.from);
		return this.data.nodes.filter((n) => predIds.includes(n.id));
	}

	getPredecessorIds(stepId: string): string[] {
		return this.data.edges.filter((e) => e.to === stepId).map((e) => e.from);
	}

	/**
	 * Get the specific step IDs whose output this step needs, based on
	 * the transpiler's variable reference analysis stored in config.dataDependencies.
	 */
	getStepDataDependencyIds(stepId: string): string[] {
		return this.getNode(stepId)?.config.dataDependencies ?? [];
	}

	/**
	 * Get ALL ancestor step IDs reachable by walking backwards through the graph.
	 * Used by gatherStepInput to load all outputs the step might reference
	 * (the transpiler rewrites variable references to ctx.input[stepId] for
	 * any ancestor, not just direct predecessors).
	 */
	getAllAncestorIds(stepId: string): string[] {
		const ancestors = new Set<string>();
		const queue = this.getPredecessorIds(stepId);

		while (queue.length > 0) {
			const current = queue.pop()!;
			if (ancestors.has(current)) continue;
			ancestors.add(current);
			for (const predId of this.getPredecessorIds(current)) {
				if (!ancestors.has(predId)) queue.push(predId);
			}
		}

		return Array.from(ancestors);
	}

	getSuccessors(stepId: string, stepOutput?: unknown): GraphNodeData[] {
		return this.data.edges
			.filter((e) => e.from === stepId)
			.filter((e) => e.condition !== '__error__') // Exclude error edges from normal succession
			.filter((e) => this.evaluateCondition(e.condition, stepOutput))
			.map((e) => this.getNodeOrFail(e.to));
	}

	getSuccessorEdges(stepId: string): GraphEdgeData[] {
		return this.data.edges.filter((e) => e.from === stepId);
	}

	getLeafNodes(): GraphNodeData[] {
		const nodesWithSuccessors = new Set(this.data.edges.map((e) => e.from));
		return this.data.nodes.filter((n) => !nodesWithSuccessors.has(n.id));
	}

	getAllNodes(): GraphNodeData[] {
		return [...this.data.nodes];
	}

	getAllEdges(): GraphEdgeData[] {
		return [...this.data.edges];
	}

	/**
	 * Get data-producing predecessors for a step, resolving through sleep nodes.
	 * Sleep nodes don't produce data — they're transparent. If a predecessor is
	 * a sleep node, trace back to its predecessors recursively until we reach
	 * data-producing nodes (steps, triggers, etc.).
	 */
	getDataPredecessors(stepId: string): GraphNodeData[] {
		const result: GraphNodeData[] = [];
		const visited = new Set<string>();

		const resolve = (ids: string[]) => {
			for (const id of ids) {
				if (visited.has(id)) continue;
				visited.add(id);
				const node = this.getNode(id);
				if (!node) continue;
				if (node.type === 'sleep') {
					// Trace back through the sleep node
					resolve(this.getPredecessorIds(id));
				} else {
					result.push(node);
				}
			}
		};

		resolve(this.getPredecessorIds(stepId));
		return result;
	}

	/**
	 * Returns successor nodes connected via '__error__' condition edges.
	 * These are catch handler steps that should run when the given step fails.
	 */
	getErrorHandlers(stepId: string): GraphNodeData[] {
		return this.data.edges
			.filter((e) => e.from === stepId && e.condition === '__error__')
			.map((e) => this.getNodeOrFail(e.to));
	}

	getBatchChildStepId(parentStepId: string, itemIndex: number): string {
		return sha256(`${parentStepId}__batch__${itemIndex}`);
	}

	toJSON(): WorkflowGraphData {
		return this.data;
	}

	private evaluateCondition(condition: string | undefined, stepOutput: unknown): boolean {
		if (!condition) return true;
		try {
			// eslint-disable-next-line @typescript-eslint/no-implied-eval
			const fn = new Function('output', `return Boolean(${condition})`);
			return fn(stepOutput) as boolean;
		} catch {
			return false;
		}
	}
}
