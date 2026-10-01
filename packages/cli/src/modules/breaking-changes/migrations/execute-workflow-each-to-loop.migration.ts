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
	parameters: {
		batchSize: 1,
		// Start a new batch when an outer loop reaches this node again.
		options: { reset: `={{ $node[${JSON.stringify(name)}].context["done"] ?? false }}` },
	},
});

/**
 * Every rewrite needs review. Specific notes help users find known changes.
 * `tailName` is the node that now carries the aggregated output.
 */
const driftNotes = (node: INode, allNodes: INode[], tailName: string): string[] => {
	const notes: string[] = [
		`Review and test the migrated workflow before publishing. The loop around "${node.name}" preserves the common execution pattern, but it can change behavior. Check expressions, item and run indexes, error handling, retry settings, and pinned data.`,
	];
	if (waitsForSubWorkflow(node)) {
		notes.push(
			`"${node.name}" now uses "Always Output Data" to keep the loop running. Each sub-workflow call that returns no items produces an empty item instead. These extra items can trigger downstream actions. Review how the workflow handles empty items.`,
		);
	}
	if (node.onError === 'continueErrorOutput') {
		notes.push(
			`"${node.name}" routes failed items to its error output. These items do not return to the loop. An error can stop the loop before it processes all inputs. Review the error path.`,
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
 * This is a suggested workflow, not an equivalent replacement. Every migration
 * reports a note so the user must review and test it before publishing.
 *
 * The rewiring for one flagged node E with predecessors P and successors S:
 *   P → E → S   becomes   P → Loop ─done→ S
 *                               └─loop→ E → Loop
 * Other outputs of E (for example an error output) keep their edges.
 *
 * The engine only continues past a node that produced at least one item. When E
 * waits for the sub-workflow and that run returns nothing for an item, the loop
 * would stall and never reach done. So in that mode E gets `alwaysOutputData`,
 * which emits one empty item instead. The loop returns this item along with
 * actual results, including real empty items. The migration reports this change.
 * In fire-and-forget mode E echoes its input item, so the setting is not needed.
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
			//    off "done".
			const nodeOutputs = nextConnections[node.name] ?? {};
			const mainOutputs: NodeInputConnections = [...(nodeOutputs[NodeConnectionTypes.Main] ?? [])];
			const successors = mainOutputs[0] ?? [];
			mainOutputs[0] = [mainConnection(loopNode.name)];
			nextConnections[node.name] = { ...nodeOutputs, [NodeConnectionTypes.Main]: mainOutputs };

			const loopOutputs: NodeInputConnections = [];
			loopOutputs[LOOP_DONE_OUTPUT] = successors;
			loopOutputs[LOOP_BATCH_OUTPUT] = [mainConnection(node.name)];
			nextConnections[loopNode.name] = { [NodeConnectionTypes.Main]: loopOutputs };
			notes.push(...driftNotes(node, nodes, loopNode.name));

			nextNodes.push(loopNode);
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
