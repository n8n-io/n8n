import { isRecord } from '@n8n/utils/is-record';
import type { IConnection, IConnections } from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import type { WorkflowNode } from '../../types';

export const STRUCTURE_ONLY_NOTE =
	'Node parameters omitted to keep context small. Pass full: true to include them in one call, or use get-json / get-as-code (optionally with versionId) for parameter-level detail.';

// Below this, summarizing saves too little to be worth a possible second full fetch.
export const PARAMETERS_INLINE_LIMIT_BYTES = 4096;

export function isSmallPayload(detail: unknown): boolean {
	return JSON.stringify(detail).length <= PARAMETERS_INLINE_LIMIT_BYTES;
}

const CONNECTION_TYPES = new Set<string>(Object.values(NodeConnectionTypes));

function isConnection(value: unknown): value is IConnection {
	return (
		isRecord(value) &&
		typeof value.node === 'string' &&
		typeof value.type === 'string' &&
		CONNECTION_TYPES.has(value.type) &&
		typeof value.index === 'number'
	);
}

/** Rebuild a typed connections map from the loosely-typed service payload. */
function toConnections(connections: Record<string, unknown>): IConnections {
	const result: IConnections = {};
	for (const [from, byType] of Object.entries(connections)) {
		if (!isRecord(byType)) continue;
		for (const [connectionType, outputs] of Object.entries(byType)) {
			if (!Array.isArray(outputs)) continue;
			(result[from] ??= {})[connectionType] = outputs.map((targets) =>
				Array.isArray(targets) ? targets.filter(isConnection) : null,
			);
		}
	}
	return result;
}

/** Flatten n8n's connections map into edges like "A → B" or "A -(ai_tool)→ B". */
function summarizeConnections(connections: Record<string, unknown>): string[] {
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

/**
 * Render a workflow's structure as SDK code with node parameters stripped —
 * the same format the agent reads from get-as-code, minus the config payloads.
 * Falls back to a plain node/edge listing when codegen rejects the graph.
 */
export async function summarizeWorkflowStructure(
	name: string,
	nodes: WorkflowNode[],
	connections: Record<string, unknown>,
): Promise<string> {
	try {
		const { generateWorkflowCode } = await import('@n8n/workflow-sdk');
		return generateWorkflowCode({
			name,
			nodes: nodes.map((node) => ({
				id: node.name,
				name: node.name,
				type: node.type,
				typeVersion: node.typeVersion ?? 1,
				position: [node.position[0] ?? 0, node.position[1] ?? 0],
			})),
			connections: toConnections(connections),
		});
	} catch {
		return [
			'Nodes:',
			...nodes.map((node) => `- ${node.name} (${node.type})`),
			'Connections:',
			...summarizeConnections(connections).map((edge) => `- ${edge}`),
		].join('\n');
	}
}
