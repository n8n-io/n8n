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

/** Applies patches in order and returns a new workflow. Throws on a patch that names a missing node. */
export function applyPatches(
	workflow: WorkflowJSON,
	patches: readonly WorkflowPatch[],
): WorkflowJSON {
	const result = deepCopy(workflow);
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
				result.nodes.push(deepCopy(patch.node));
				break;
			case 'remove_node': {
				find(patch.nodeName);
				const incoming = incomingEdges(result, patch.nodeName);
				// Successors, without a self-loop, so predecessors reconnect straight to them.
				const outgoing = outgoingEdges(result, patch.nodeName).filter(
					(edge) => edge.to !== patch.nodeName,
				);
				result.nodes = result.nodes.filter((node) => node.name !== patch.nodeName);
				delete result.connections[patch.nodeName];
				for (const edge of incoming) {
					const slot = result.connections[edge.from]?.main?.[edge.fromOutput];
					if (!slot) continue;
					const index = slot.findIndex((c) => c.node === patch.nodeName);
					if (index >= 0) slot.splice(index, 1);
					for (const next of outgoing)
						if (!slot.some((c) => c.node === next.to))
							slot.push({ node: next.to, type: 'main', index: next.toInput });
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
				const main = ((result.connections[patch.from] ??= {}).main ??= []);
				while (main.length <= patch.fromOutput) main.push([]);
				const slot = (main[patch.fromOutput] ??= []);
				if (!slot.some((c) => c.node === patch.to && c.index === patch.toInput))
					slot.push({ node: patch.to, type: 'main', index: patch.toInput });
				break;
			}
			case 'remove_edge': {
				const slot = result.connections[patch.from]?.main?.[patch.fromOutput];
				const index =
					slot?.findIndex((c) => c.node === patch.to && c.index === patch.toInput) ?? -1;
				if (index >= 0) slot?.splice(index, 1);
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
	return Object.entries(workflow.connections).flatMap(([from, outputs]) =>
		(outputs.main ?? []).flatMap((slot, fromOutput) =>
			(slot ?? [])
				.filter((connection) => connection.node === nodeName)
				.map((connection) => ({ from, fromOutput, toInput: connection.index })),
		),
	);
}

export function outgoingEdges(
	workflow: WorkflowJSON,
	nodeName: string,
): Array<{ to: string; fromOutput: number; toInput: number }> {
	return (workflow.connections[nodeName]?.main ?? []).flatMap((slot, fromOutput) =>
		(slot ?? []).map((connection) => ({
			to: connection.node,
			fromOutput,
			toInput: connection.index,
		})),
	);
}

/** Names of nodes whose parameters or wiring a patch set touches. */
export function affectedNodeNames(patches: readonly WorkflowPatch[]): Set<string> {
	const names = new Set<string>();
	for (const patch of patches) {
		if (patch.op === 'add_node') {
			if (patch.node.name) names.add(patch.node.name);
		} else if (patch.op === 'remove_node' || patch.op === 'update_node') names.add(patch.nodeName);
		else if (patch.op === 'add_edge' || patch.op === 'remove_edge') {
			names.add(patch.from);
			names.add(patch.to);
		}
	}
	return names;
}
