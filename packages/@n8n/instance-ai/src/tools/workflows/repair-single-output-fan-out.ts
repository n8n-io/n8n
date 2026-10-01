import { resolveMainOutputCount, type WorkflowJSON } from '@n8n/workflow-sdk';
import type { INodeTypes } from 'n8n-workflow';

import type { ValidationWarning } from './workflow-validation-warnings';

interface ConnectionTarget {
	node: string;
	type: string;
	index: number;
}

function isSameTarget(a: ConnectionTarget, b: ConnectionTarget): boolean {
	return a.node === b.node && a.type === b.type && a.index === b.index;
}

/**
 * On the workflow builder, `.to([a, b])` assigns one target per output index.
 * Builders use it to send one node's items to parallel steps, so on a node with
 * a single main output the extra indices are impossible edges. Moves those
 * targets onto output 0, which is the only reading the saved workflow allows.
 * Nodes that route an error output keep their indices for the validator.
 */
export function repairSingleOutputFanOut(
	json: WorkflowJSON,
	nodeTypesProvider: INodeTypes | undefined,
): ValidationWarning[] {
	if (!nodeTypesProvider) return [];

	const nodesByName = new Map((json.nodes ?? []).map((node) => [node.name, node]));
	const warnings: ValidationWarning[] = [];

	for (const [sourceName, nodeConnections] of Object.entries(json.connections ?? {})) {
		const main = nodeConnections.main;
		if (!Array.isArray(main) || main.length <= 1) continue;

		const sourceNode = nodesByName.get(sourceName);
		if (!sourceNode || sourceNode.onError === 'continueErrorOutput') continue;

		const version =
			typeof sourceNode.typeVersion === 'string'
				? parseFloat(sourceNode.typeVersion)
				: (sourceNode.typeVersion ?? 1);
		if (resolveMainOutputCount(nodeTypesProvider, sourceNode.type, version) !== 1) continue;

		const extraTargets = main.slice(1).flatMap((targets) => targets ?? []);
		if (extraTargets.length === 0) continue;

		const merged = [...(main[0] ?? [])];
		for (const target of extraTargets) {
			if (!merged.some((existing) => isSameTarget(existing, target))) merged.push(target);
		}
		nodeConnections.main = [merged];

		const targetNames = [...new Set(merged.map((target) => `'${target.node}'`))].join(', ');
		warnings.push({
			code: 'AUTO_REPAIRED_FAN_OUT',
			nodeName: sourceName,
			severity: 'informational',
			message:
				`'${sourceName}' has one output, so its array targets (${targetNames}) were connected in parallel from that output. ` +
				'On the workflow builder, .to([a, b]) assigns one target per output index. ' +
				'For parallel steps from a single-output node, write .to(sourceNode.to([a, b])) in the source.',
		});
	}

	return warnings;
}
