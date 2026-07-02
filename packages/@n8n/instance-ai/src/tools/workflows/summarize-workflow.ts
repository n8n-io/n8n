import { isRecord } from '@n8n/utils/is-record';

import type { WorkflowNode } from '../../types';

export const STRUCTURE_ONLY_NOTE =
	'Node parameters omitted to keep context small. Use get-json or get-as-code when you need parameter-level detail.';

export function summarizeNodes(nodes: WorkflowNode[]): Array<{ name: string; type: string }> {
	return nodes.map(({ name, type }) => ({ name, type }));
}

/** Flatten n8n's connections map into edges like "A → B" or "A -(ai_tool)→ B". */
export function summarizeConnections(connections: Record<string, unknown>): string[] {
	const edges: string[] = [];
	for (const [from, byType] of Object.entries(connections)) {
		if (!isRecord(byType)) continue;
		for (const [connectionType, outputs] of Object.entries(byType)) {
			if (!Array.isArray(outputs)) continue;
			outputs.forEach((targets, outputIndex) => {
				if (!Array.isArray(targets)) return;
				for (const target of targets) {
					if (!isRecord(target) || typeof target.node !== 'string') continue;
					const typeLabel = connectionType === 'main' ? '' : `-(${connectionType})`;
					const branchLabel = outputIndex > 0 ? `[${outputIndex}]` : '';
					edges.push(`${from} ${typeLabel}${branchLabel}→ ${target.node}`);
				}
			});
		}
	}
	return edges;
}
