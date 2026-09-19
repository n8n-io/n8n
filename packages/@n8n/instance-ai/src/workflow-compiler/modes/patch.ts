import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { deepCopy } from 'n8n-workflow';

type NodeJSON = WorkflowJSON['nodes'][number];

/** Minimal graph edits applied to an existing workflow. Unaffected nodes are untouched. */
export type WorkflowPatch =
	| { op: 'add_node'; node: NodeJSON }
	| { op: 'remove_node'; nodeName: string }
	| {
			op: 'update_node';
			nodeName: string;
			parameters?: NonNullable<NodeJSON['parameters']>;
			settings?: Partial<
				Omit<NodeJSON, 'parameters' | 'id' | 'name' | 'type' | 'typeVersion' | 'position'>
			>;
	  }
	| { op: 'add_edge'; from: string; fromOutput: number; to: string; toInput: number }
	| { op: 'remove_edge'; from: string; fromOutput: number; to: string; toInput: number }
	| { op: 'rename_workflow'; name: string };

function clone<T extends object>(value: T): T {
	return deepCopy(value);
}

/** Applies patches in order and returns a new workflow. Throws on a patch that names a missing node. */
export function applyPatches(
	workflow: WorkflowJSON,
	patches: readonly WorkflowPatch[],
): WorkflowJSON {
	const result = clone(workflow);
	const find = (name: string) => {
		const node = result.nodes.find((candidate) => candidate.name === name);
		if (!node) throw new Error(`Patch targets unknown node "${name}".`);
		return node;
	};
	for (const patch of patches) {
		switch (patch.op) {
			case 'add_node':
				if (result.nodes.some((node) => node.name === patch.node.name))
					throw new Error(`Node "${patch.node.name}" already exists.`);
				result.nodes.push(clone(patch.node));
				break;
			case 'remove_node': {
				find(patch.nodeName);
				const incoming = incomingEdges(result, patch.nodeName);
				const outgoing = (result.connections[patch.nodeName]?.main ?? []).flatMap(
					(slot) => slot ?? [],
				);
				result.nodes = result.nodes.filter((node) => node.name !== patch.nodeName);
				delete result.connections[patch.nodeName];
				for (const edge of incoming) {
					const slot = result.connections[edge.from]?.main?.[edge.fromOutput];
					if (!slot) continue;
					const index = slot.findIndex((c) => c.node === patch.nodeName);
					if (index >= 0) slot.splice(index, 1);
					// Reconnect predecessors straight to the removed node's successors.
					for (const next of outgoing)
						if (!slot.some((c) => c.node === next.node))
							slot.push({ node: next.node, type: 'main', index: next.index });
				}
				break;
			}
			case 'update_node': {
				const node = find(patch.nodeName);
				if (patch.parameters) node.parameters = { ...(node.parameters ?? {}), ...patch.parameters };
				if (patch.settings) Object.assign(node, patch.settings);
				break;
			}
			case 'add_edge': {
				find(patch.from);
				find(patch.to);
				const source = (result.connections[patch.from] ??= {});
				const main = (source.main ??= []);
				while (main.length <= patch.fromOutput) main.push([]);
				const slot = (main[patch.fromOutput] ??= []);
				if (!slot.some((c) => c.node === patch.to && c.index === patch.toInput))
					slot.push({ node: patch.to, type: 'main', index: patch.toInput });
				break;
			}
			case 'remove_edge': {
				const slot = result.connections[patch.from]?.main?.[patch.fromOutput];
				if (!slot) break;
				const index = slot.findIndex((c) => c.node === patch.to && c.index === patch.toInput);
				if (index >= 0) slot.splice(index, 1);
				break;
			}
			case 'rename_workflow':
				result.name = patch.name;
				break;
		}
	}
	return result;
}

export function incomingEdges(
	workflow: WorkflowJSON,
	nodeName: string,
): Array<{ from: string; fromOutput: number; toInput: number }> {
	const edges: Array<{ from: string; fromOutput: number; toInput: number }> = [];
	for (const [from, outputs] of Object.entries(workflow.connections)) {
		(outputs.main ?? []).forEach((slot, fromOutput) => {
			for (const connection of slot ?? [])
				if (connection.node === nodeName)
					edges.push({ from, fromOutput, toInput: connection.index });
		});
	}
	return edges;
}

export function outgoingEdges(
	workflow: WorkflowJSON,
	nodeName: string,
): Array<{ to: string; fromOutput: number; toInput: number }> {
	const edges: Array<{ to: string; fromOutput: number; toInput: number }> = [];
	(workflow.connections[nodeName]?.main ?? []).forEach((slot, fromOutput) => {
		for (const connection of slot ?? [])
			edges.push({ to: connection.node, fromOutput, toInput: connection.index });
	});
	return edges;
}

/** Names of nodes whose parameters or wiring a patch set touches. */
export function affectedNodeNames(patches: readonly WorkflowPatch[]): Set<string> {
	const names = new Set<string>();
	for (const patch of patches) {
		switch (patch.op) {
			case 'add_node':
				if (patch.node.name) names.add(patch.node.name);
				break;
			case 'remove_node':
			case 'update_node':
				names.add(patch.nodeName);
				break;
			case 'add_edge':
			case 'remove_edge':
				names.add(patch.from);
				names.add(patch.to);
				break;
			default:
				break;
		}
	}
	return names;
}
