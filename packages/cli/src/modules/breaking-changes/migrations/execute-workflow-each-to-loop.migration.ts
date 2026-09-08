import { randomUUID } from 'node:crypto';
import type { IConnection, IConnections, INode, NodeInputConnections } from 'n8n-workflow';
import { deepCopy, NodeConnectionTypes } from 'n8n-workflow';

import type { WorkflowMigration } from './node-migration';

const LOOP_NODE_TYPE = 'n8n-nodes-base.splitInBatches';
const LOOP_NODE_VERSION = 3;
const LOOP_NODE_DEFAULT_NAME = 'Loop Over Items';
// Loop Over Items v3 outputs: index 0 fires once with every item after the last
// iteration, index 1 fires per batch with the items of that batch.
const LOOP_DONE_OUTPUT = 0;
const LOOP_BATCH_OUTPUT = 1;
// Puts the sub-workflow node inside the loop body: right of the loop, one row down.
const LOOP_BODY_OFFSET: [number, number] = [240, 180];

const uniqueNodeName = (base: string, taken: Set<string>): string => {
	if (!taken.has(base)) return base;
	for (let i = 1; ; i++) {
		const candidate = `${base}${i}`;
		if (!taken.has(candidate)) return candidate;
	}
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whether any string inside `value` references `nodeName` through `$('…')`, `$node['…']` or `$items('…')`. */
const referencesNodeByName = (value: unknown, nodeName: string): boolean => {
	const pattern = new RegExp(
		String.raw`\$(?:\(|node\[|items\()\s*['"]${escapeRegExp(nodeName)}['"]`,
	);
	const visit = (candidate: unknown): boolean => {
		if (typeof candidate === 'string') return pattern.test(candidate);
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

/**
 * Execute Sub-workflow "Run once for each item" → Loop Over Items (batch size 1)
 * wrapped around the same node in "Run once with all items" mode.
 *
 * Runtime equivalence: `each` ran the sub-workflow once per input item with
 * `[item]` and concatenated the results; the loop feeds one item per iteration
 * to the same node in `once` mode, and the loop's done output emits every item
 * that came back, in order. That holds for both "wait for completion" settings.
 *
 * The rewiring for one flagged node E with predecessors P and successors S:
 *   P → E → S   becomes   P → Loop ─done→ S
 *                               └─loop→ E → Loop
 * Other outputs of E (for example an error output) keep their edges.
 */
export const executeWorkflowEachToLoop: WorkflowMigration = {
	ruleId: 'execute-workflow-each-mode-v3',
	migrateWorkflow: ({ nodes, connections, affectedNodeIds }) => {
		const nextConnections: IConnections = deepCopy(connections);
		const takenNames = new Set(nodes.map((node) => node.name));
		const nextNodes: INode[] = [];
		const migratedNodeIds: string[] = [];
		const notes: string[] = [];

		for (const original of nodes) {
			if (!affectedNodeIds.has(original.id)) {
				nextNodes.push(original);
				continue;
			}

			const loopName = uniqueNodeName(LOOP_NODE_DEFAULT_NAME, takenNames);
			takenNames.add(loopName);

			const loopNode: INode = {
				id: randomUUID(),
				name: loopName,
				type: LOOP_NODE_TYPE,
				typeVersion: LOOP_NODE_VERSION,
				position: [...original.position],
				parameters: { batchSize: 1, options: {} },
			};
			const node: INode = {
				...original,
				position: [
					original.position[0] + LOOP_BODY_OFFSET[0],
					original.position[1] + LOOP_BODY_OFFSET[1],
				],
				parameters: { ...original.parameters, mode: 'once' },
			};

			// 1. Every main edge that fed the node now feeds the loop.
			for (const outputs of Object.values(nextConnections)) {
				for (const targets of outputs[NodeConnectionTypes.Main] ?? []) {
					for (const target of targets ?? []) {
						if (target.node === node.name) target.node = loopName;
					}
				}
			}

			// 2. The node's main output goes back into the loop; its old successors hang off "done".
			const nodeOutputs = nextConnections[node.name] ?? {};
			const mainOutputs: NodeInputConnections = [...(nodeOutputs[NodeConnectionTypes.Main] ?? [])];
			const successors = mainOutputs[0] ?? [];
			mainOutputs[0] = [mainConnection(loopName)];
			nextConnections[node.name] = { ...nodeOutputs, [NodeConnectionTypes.Main]: mainOutputs };

			const loopOutputs: NodeInputConnections = [];
			loopOutputs[LOOP_DONE_OUTPUT] = successors;
			loopOutputs[LOOP_BATCH_OUTPUT] = [mainConnection(node.name)];
			nextConnections[loopName] = { [NodeConnectionTypes.Main]: loopOutputs };

			// 3. Behavior that the loop form cannot reproduce exactly.
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
			const referencing = nodes
				.filter(
					(other) => other.id !== node.id && referencesNodeByName(other.parameters, node.name),
				)
				.map((other) => other.name);
			if (referencing.length > 0) {
				notes.push(
					`${referencing.map((name) => `"${name}"`).join(', ')} reference "${node.name}" in expressions. It now runs once per loop iteration, so \`$('${node.name}').all()\` returns only the last iteration's output; read from "${loopName}" instead.`,
				);
			}

			nextNodes.push(loopNode, node);
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
