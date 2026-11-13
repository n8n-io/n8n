/**
 * The node graph of a v1 workflow and the static run order of its nodes.
 *
 * The order follows the v1 execution order (`settings.executionOrder: 'v1'`,
 * `WorkflowExecute` in n8n-core): after a node runs, its children go to the
 * front of the run stack, the child that is highest on the canvas first (then
 * the leftmost). A node with more than one incoming connection waits until
 * every parent has run. When the stack is empty, a waiting node runs with the
 * inputs it has.
 */

import type { N8nNode, N8nWorkflow } from './types.ts';

export interface Edge {
	from: string;
	output: number;
	to: string;
	input: number;
}

export class Graph {
	readonly nodes = new Map<string, N8nNode>();

	readonly edges: Edge[] = [];

	/** Connections of a type other than `main`, such as AI sub-nodes. */
	readonly otherConnections: Array<{ from: string; to: string; type: string }> = [];

	constructor(workflow: N8nWorkflow) {
		for (const node of workflow.nodes) this.nodes.set(node.name, node);
		// `mapConnectionsByDestination` of n8n-workflow does the same inversion, but the
		// ESM build of n8n-workflow does not load in Node's strip-only TypeScript mode,
		// which the `wfc` command line uses.
		for (const [from, types] of Object.entries(workflow.connections ?? {})) {
			for (const [type, outputs] of Object.entries(types ?? {})) {
				(outputs ?? []).forEach((targets, output) => {
					for (const t of targets ?? []) {
						if (typeof t?.node !== 'string') continue;
						if (!this.nodes.has(from) || !this.nodes.has(t.node)) continue;
						const input = Number(t.index) || 0;
						const kind = typeof t.type === 'string' ? t.type : type;
						if (kind === 'main' && type === 'main')
							this.edges.push({ from, output, to: t.node, input });
						// v1 follows only `main` and the AI types (`ai_*`); it ignores a connection
						// under another key, such as `done` or `error`.
						else if (kind.startsWith('ai_') || type.startsWith('ai_'))
							this.otherConnections.push({ from, to: t.node, type: kind });
					}
				});
			}
		}
		// Keep the order of the source document: by source, output, then position in the list.
		const rank = new Map<string, number>();
		let r = 0;
		for (const [from, types] of Object.entries(workflow.connections)) {
			for (const [output, targets] of (types?.main ?? []).entries()) {
				for (const t of targets ?? []) rank.set(`${from}|${output}|${t.node}|${t.index}`, r++);
			}
		}
		const key = (e: Edge) => `${e.from}|${e.output}|${e.to}|${e.input}`;
		this.edges.sort((a, b) => (rank.get(key(a)) ?? 0) - (rank.get(key(b)) ?? 0));
	}

	/** The edges by target and by source, built once: the edges do not change after the constructor. */
	private byTarget: Map<string, Edge[]> | undefined;

	private bySource: Map<string, Edge[]> | undefined;

	private index(): void {
		this.byTarget = new Map();
		this.bySource = new Map();
		for (const e of this.edges) {
			const to = this.byTarget.get(e.to);
			if (to) to.push(e);
			else this.byTarget.set(e.to, [e]);
			const from = this.bySource.get(e.from);
			if (from) from.push(e);
			else this.bySource.set(e.from, [e]);
		}
	}

	/** The edges into `name`, in document order. Callers get a copy. */
	incoming(name: string): Edge[] {
		if (!this.byTarget) this.index();
		return [...(this.byTarget?.get(name) ?? [])];
	}

	/** The edges out of `name`, in document order. Callers get a copy. */
	outgoing(name: string): Edge[] {
		if (!this.bySource) this.index();
		return [...(this.bySource?.get(name) ?? [])];
	}

	position(name: string): [number, number] {
		const p = this.nodes.get(name)?.position;
		return Array.isArray(p) && p.length >= 2 ? [Number(p[0]) || 0, Number(p[1]) || 0] : [0, 0];
	}

	/** Nodes that the trigger reaches through main connections. */
	reachable(trigger: string): Set<string> {
		const seen = new Set<string>([trigger]);
		const queue = [trigger];
		while (queue.length > 0) {
			const n = queue.shift() ?? '';
			for (const e of this.outgoing(n)) {
				if (!seen.has(e.to)) {
					seen.add(e.to);
					queue.push(e.to);
				}
			}
		}
		return seen;
	}

	/** A node of a cycle among `scope`, or null. */
	cycleNode(scope: Set<string>): string | null {
		const state = new Map<string, 'open' | 'done'>();
		const visit = (n: string): string | null => {
			state.set(n, 'open');
			for (const e of this.outgoing(n)) {
				if (!scope.has(e.to)) continue;
				const s = state.get(e.to);
				if (s === 'open') return e.to;
				if (s === undefined) {
					const found = visit(e.to);
					if (found) return found;
				}
			}
			state.set(n, 'done');
			return null;
		};
		for (const n of scope) {
			if (!state.has(n)) {
				const found = visit(n);
				if (found) return found;
			}
		}
		return null;
	}

	/**
	 * The order in which items arrive on each edge when v1 runs the graph from
	 * `trigger` and every output has items: a node with one input runs once for
	 * each parent run (depth first, children by canvas position), a node with
	 * several inputs runs when each input has items. The key is
	 * `from|output|to|input`. The simulation stops after `limit` runs.
	 */
	arrivalOrder(trigger: string, limit = 5000): Map<string, number> {
		const scope = this.reachable(trigger);
		const order = new Map<string, number>();
		const stack: Array<{ node: string; via: string[] }> = [{ node: trigger, via: [] }];
		const waiting = new Map<string, { inputs: Set<number>; via: string[] }>();
		const inputCount = (n: string) =>
			Math.max(
				1,
				...this.incoming(n)
					.filter((e) => scope.has(e.from))
					.map((e) => e.input + 1),
			);
		for (let runs = 0; runs < limit; runs++) {
			if (stack.length === 0) {
				const next = [...waiting.entries()][0];
				if (next === undefined) break;
				waiting.delete(next[0]);
				stack.push({ node: next[0], via: next[1].via });
			}
			const job = stack.shift();
			if (!job) break;
			// The edges that brought the items of this run, in the order in which the node runs.
			for (const key of job.via) if (!order.has(key)) order.set(key, order.size);
			const children = this.outgoing(job.node)
				.filter((e) => scope.has(e.to))
				.map((e, k) => ({ e, k, pos: this.position(e.to) }))
				.sort((x, y) => y.pos[1] - x.pos[1] || y.pos[0] - x.pos[0] || x.k - y.k);
			for (const { e } of children) {
				const key = `${e.from}|${e.output}|${e.to}|${e.input}`;
				if (inputCount(e.to) > 1) {
					const got = waiting.get(e.to) ?? { inputs: new Set<number>(), via: [] };
					got.inputs.add(e.input);
					got.via.push(key);
					if (got.inputs.size >= inputCount(e.to)) {
						waiting.delete(e.to);
						stack.unshift({ node: e.to, via: got.via });
					} else {
						waiting.set(e.to, got);
					}
				} else {
					stack.unshift({ node: e.to, via: [key] });
				}
			}
		}
		return order;
	}

	/**
	 * The run order of the nodes that `trigger` reaches. The graph must have no
	 * cycle among them.
	 */
	runOrder(trigger: string): string[] {
		const scope = this.reachable(trigger);
		const needed = new Map<string, number>();
		for (const n of scope) {
			needed.set(n, this.incoming(n).filter((e) => scope.has(e.from)).length);
		}
		const arrived = new Map<string, number>();
		const order: string[] = [];
		const done = new Set<string>();
		const waiting: string[] = [];
		const stack: string[] = [trigger];
		for (;;) {
			if (stack.length === 0) {
				// v1 runs a waiting node only when none of its parents waits too.
				const next = waiting.find(
					(w) => !this.incoming(w).some((e) => waiting.includes(e.from) && e.from !== w),
				);
				if (next === undefined) break;
				waiting.splice(waiting.indexOf(next), 1);
				stack.push(next);
			}
			const n = stack.shift() ?? '';
			if (done.has(n)) continue;
			done.add(n);
			order.push(n);
			const children: string[] = [];
			for (const e of this.outgoing(n)) {
				if (!scope.has(e.to)) continue;
				arrived.set(e.to, (arrived.get(e.to) ?? 0) + 1);
				if (!children.includes(e.to)) children.push(e.to);
			}
			// Top first, then left first, as the v1 sort before `unshift` gives.
			children.sort((a, b) => {
				const [ax, ay] = this.position(a);
				const [bx, by] = this.position(b);
				return ay - by || ax - bx;
			});
			for (const c of [...children].reverse()) {
				if (done.has(c)) continue;
				if ((arrived.get(c) ?? 0) >= (needed.get(c) ?? 0)) {
					const w = waiting.indexOf(c);
					if (w >= 0) waiting.splice(w, 1);
					stack.unshift(c);
				} else if (!waiting.includes(c)) {
					waiting.push(c);
				}
			}
		}
		return order;
	}
}
