import type { IConnection, IConnections, INode, NodeInputConnections } from 'n8n-workflow';
import { deepCopy, NodeConnectionTypes } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import type { WorkflowMigration } from './node-migration';

const LOOP_NODE_TYPE = 'n8n-nodes-base.splitInBatches';
const LOOP_NODE_VERSION = 3;
const LOOP_NODE_DEFAULT_NAME = 'Loop Over Items';
// Loop Over Items v3 outputs: index 0 fires once with every item after the last
// iteration, index 1 fires per batch with the items of that batch.
const LOOP_DONE_OUTPUT = 0;
const LOOP_BATCH_OUTPUT = 1;

const FILTER_NODE_TYPE = 'n8n-nodes-base.filter';
const FILTER_NODE_VERSION = 2.2;
const FILTER_NODE_DEFAULT_NAME = 'Drop empty results';

// One canvas column to the right; one row down puts a node inside the loop body.
const COLUMN_OFFSET = 240;
const ROW_OFFSET = 180;

const uniqueNodeName = (base: string, taken: Set<string>): string => {
	if (!taken.has(base)) return base;
	for (let i = 1; ; i++) {
		const candidate = `${base}${i}`;
		if (!taken.has(candidate)) return candidate;
	}
};

const JS_IDENTIFIER = /^[A-Za-z_$][\w$]*$/;
const JS_IDENTIFIER_CHAR = /[\w$]/;

/**
 * Whether any string inside `value` references `nodeName` the way expressions
 * do: `$('…')`, `$node['…']`, `$items('…')`, or `$node.Name` for names that are
 * valid identifiers. Mirrors the access patterns the node-rename logic handles.
 */
const referencesNodeByName = (value: unknown, nodeName: string): boolean => {
	const quoted = ['$(', '$node[', '$items('].flatMap((prefix) => [
		`${prefix}'${nodeName}'`,
		`${prefix}"${nodeName}"`,
	]);
	const dotted = JS_IDENTIFIER.test(nodeName) ? `$node.${nodeName}` : undefined;

	const matches = (text: string): boolean => {
		if (quoted.some((needle) => text.includes(needle))) return true;
		if (!dotted) return false;
		// `$node.Sub` must not match `$node.Sub2`.
		for (let from = 0; ; ) {
			const at = text.indexOf(dotted, from);
			if (at === -1) return false;
			const next = text[at + dotted.length];
			if (next === undefined || !JS_IDENTIFIER_CHAR.test(next)) return true;
			from = at + dotted.length;
		}
	};
	const visit = (candidate: unknown): boolean => {
		if (typeof candidate === 'string') return matches(candidate);
		if (Array.isArray(candidate)) return candidate.some(visit);
		if (candidate && typeof candidate === 'object') return Object.values(candidate).some(visit);
		return false;
	};
	return visit(value);
};

const mainConnection = (node: string): IConnection => ({
	node,
	type: NodeConnectionTypes.Main,
	index: 0,
});

/** "Wait for sub-workflow completion" is on unless the option is explicitly off. */
const waitsForSubWorkflow = (node: INode): boolean => {
	const options = node.parameters.options;
	if (!options || typeof options !== 'object') return true;
	return (options as { waitForSubWorkflow?: unknown }).waitForSubWorkflow !== false;
};

const makeLoopNode = (name: string, position: INode['position']): INode => ({
	id: randomUUID(),
	name,
	type: LOOP_NODE_TYPE,
	typeVersion: LOOP_NODE_VERSION,
	position,
	parameters: { batchSize: 1, options: {} },
});

/**
 * Drops the `alwaysOutputData` placeholders: items with neither JSON fields nor
 * binary data. A file returned by the sub-workflow has empty JSON but binary
 * data, so it passes.
 *
 * A real item with empty JSON and no binary is indistinguishable from the
 * placeholder and is dropped too. This is deliberate: the engine fixes the
 * placeholder shape, and no downstream node runs when the wrapped node emits
 * nothing, so there is no way to tag the placeholder. We also do not report it
 * as a drift note, because nearly every each-mode node waits for the
 * sub-workflow and a note would block one-click publish for almost all
 * migrations to protect an item that carries no data.
 */
const makeFilterNode = (name: string, position: INode['position']): INode => ({
	id: randomUUID(),
	name,
	type: FILTER_NODE_TYPE,
	typeVersion: FILTER_NODE_VERSION,
	position,
	parameters: {
		conditions: {
			options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
			conditions: [
				{
					id: randomUUID(),
					leftValue: '={{ Object.keys($json).length + Object.keys($binary ?? {}).length }}',
					rightValue: 0,
					operator: { type: 'number', operation: 'gt' },
				},
			],
			combinator: 'and',
		},
		options: {},
	},
});

/**
 * Behavior the loop form cannot reproduce exactly. Any note blocks the one-click
 * re-publish, so the user reviews the workflow first. `tailName` is the node that
 * now carries the aggregated output.
 */
const driftNotes = (node: INode, allNodes: INode[], tailName: string): string[] => {
	const notes: string[] = [];
	if (node.onError === 'continueErrorOutput') {
		notes.push(
			`"${node.name}" routes failed items to its error output. Inside the loop those items no longer flow back, so the loop's "done" output only carries the items that succeeded.`,
		);
	}
	if (node.executeOnce) {
		notes.push(
			`"${node.name}" has "Execute Once" enabled, which used to limit it to the first item. Inside the loop it now runs for every item; disable the loop or the setting if that is not intended.`,
		);
	}
	if (node.retryOnFail) {
		notes.push(
			`"${node.name}" has "Retry On Fail" enabled. A failure used to retry the sub-workflow for every item; inside the loop only the failing item is retried.`,
		);
	}
	const referencing = allNodes
		.filter((other) => other.id !== node.id && referencesNodeByName(other.parameters, node.name))
		.map((other) => other.name);
	if (referencing.length > 0) {
		notes.push(
			`${referencing.map((name) => `"${name}"`).join(', ')} reference "${node.name}" in expressions. It now runs once per loop iteration, so \`$('${node.name}').all()\` returns only the last iteration's output; read from "${tailName}" instead.`,
		);
	}
	return notes;
};

/**
 * Execute Sub-workflow "Run once for each item" → Loop Over Items (batch size 1)
 * wrapped around the same node in "Run once with all items" mode.
 *
 * Runtime equivalence: `each` ran the sub-workflow once per input item with
 * `[item]` and concatenated the results; the loop feeds one item per iteration
 * to the same node in `once` mode, and the loop's done output emits every item
 * that came back, in order.
 *
 * The rewiring for one flagged node E with predecessors P and successors S:
 *   P → E → S   becomes   P → Loop ─done→ [Filter →] S
 *                               └─loop→ E → Loop
 * Other outputs of E (for example an error output) keep their edges.
 *
 * The engine only continues past a node that produced at least one item. When E
 * waits for the sub-workflow and that run returns nothing for an item, the loop
 * would stall and never reach done. So in that mode E gets `alwaysOutputData`,
 * which emits one `{}` placeholder instead, and a Filter after done drops items
 * whose JSON is empty. A sub-workflow that legitimately returns `{}` items loses
 * them; that is the one known drift of this construct. In fire-and-forget mode E
 * echoes its input item, so neither is needed.
 */
export const executeWorkflowEachToLoop: WorkflowMigration = {
	ruleId: 'execute-workflow-each-mode-v3',
	migrateWorkflow: ({ nodes, connections, affectedNodeIds }) => {
		const nextConnections: IConnections = deepCopy(connections);
		const takenNames = new Set(nodes.map((node) => node.name));
		const claimName = (base: string) => {
			const name = uniqueNodeName(base, takenNames);
			takenNames.add(name);
			return name;
		};
		const nextNodes: INode[] = [];
		const migratedNodeIds: string[] = [];
		const notes: string[] = [];

		for (const original of nodes) {
			if (!affectedNodeIds.has(original.id)) {
				nextNodes.push(original);
				continue;
			}

			const [x, y] = original.position;
			const waits = waitsForSubWorkflow(original);

			const loopNode = makeLoopNode(claimName(LOOP_NODE_DEFAULT_NAME), [x, y]);
			const filterNode = waits
				? makeFilterNode(claimName(FILTER_NODE_DEFAULT_NAME), [x + COLUMN_OFFSET, y])
				: undefined;
			const node: INode = {
				...original,
				position: [x + COLUMN_OFFSET, y + ROW_OFFSET],
				parameters: { ...original.parameters, mode: 'once' },
				...(waits ? { alwaysOutputData: true } : {}),
			};

			// 1. Every main edge that fed the node now feeds the loop.
			for (const outputs of Object.values(nextConnections)) {
				for (const targets of outputs[NodeConnectionTypes.Main] ?? []) {
					for (const target of targets ?? []) {
						if (target.node === node.name) target.node = loopNode.name;
					}
				}
			}

			// 2. The node's main output goes back into the loop; its old successors hang
			//    off "done", behind the filter when there is one.
			const nodeOutputs = nextConnections[node.name] ?? {};
			const mainOutputs: NodeInputConnections = [...(nodeOutputs[NodeConnectionTypes.Main] ?? [])];
			const successors = mainOutputs[0] ?? [];
			mainOutputs[0] = [mainConnection(loopNode.name)];
			nextConnections[node.name] = { ...nodeOutputs, [NodeConnectionTypes.Main]: mainOutputs };

			const loopOutputs: NodeInputConnections = [];
			loopOutputs[LOOP_DONE_OUTPUT] = filterNode ? [mainConnection(filterNode.name)] : successors;
			loopOutputs[LOOP_BATCH_OUTPUT] = [mainConnection(node.name)];
			nextConnections[loopNode.name] = { [NodeConnectionTypes.Main]: loopOutputs };
			if (filterNode) {
				nextConnections[filterNode.name] = { [NodeConnectionTypes.Main]: [successors] };
			}

			notes.push(...driftNotes(node, nodes, (filterNode ?? loopNode).name));

			nextNodes.push(loopNode);
			if (filterNode) nextNodes.push(filterNode);
			nextNodes.push(node);
			migratedNodeIds.push(node.id);
		}

		return {
			nodes: nextNodes,
			connections: nextConnections,
			migratedNodeIds,
			notes: notes.length > 0 ? notes : undefined,
		};
	},
};
