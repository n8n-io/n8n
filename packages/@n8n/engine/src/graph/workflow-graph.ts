import { createHash } from 'node:crypto';

import type { WorkflowGraphData, GraphNodeData, GraphEdgeData } from './graph.types';

function sha256(input: string): string {
	return createHash('sha256').update(input).digest('hex').substring(0, 12);
}

export class WorkflowGraph {
	constructor(private data: WorkflowGraphData) {}

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

	getSuccessors(stepId: string, stepOutput?: unknown): GraphNodeData[] {
		return this.data.edges
			.filter((e) => e.from === stepId)
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

	getFanOutChildStepId(parentStepId: string, itemIndex: number): string {
		return sha256(`${parentStepId}__fanout__${itemIndex}`);
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
