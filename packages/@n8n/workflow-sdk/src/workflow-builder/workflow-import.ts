/**
 * Workflow Import Utility
 *
 * Parses n8n JSON format into internal graph structures.
 */

import { deepCopy } from 'n8n-workflow';

import type {
	WorkflowJSON,
	NodeInstance,
	GraphNode,
	ConnectionTarget,
	IDataObject,
	CredentialReference,
	NewCredentialValue,
} from '../types/base';

/**
 * Result of parsing a workflow JSON
 */
export interface ParsedWorkflow {
	readonly id: string;
	readonly name: string;
	readonly settings?: Record<string, unknown>;
	readonly nodes: Map<string, GraphNode>;
	readonly lastNode: string | null;
	readonly pinData?: Record<string, IDataObject[]>;
	readonly meta?: { templateId?: string; instanceId?: string; [key: string]: unknown };
}

/**
 * Parse workflow JSON into internal graph structures.
 * This is a pure function that doesn't depend on WorkflowBuilderImpl.
 */
export function parseWorkflowJSON(json: WorkflowJSON): ParsedWorkflow {
	const nodes = new Map<string, GraphNode>();
	// Map from connection name (how nodes reference each other) to map key
	const nameToKey = new Map<string, string>();

	// Create node instances from JSON
	let unnamedCounter = 0;
	for (const n8nNode of json.nodes) {
		const version = `v${n8nNode.typeVersion}`;

		// Preserve original credentials exactly - don't transform
		const credentials = n8nNode.credentials
			? (deepCopy(n8nNode.credentials) as Record<string, CredentialReference | NewCredentialValue>)
			: undefined;

		// For nodes without a name (like sticky notes), use the id as the internal name
		const nodeName = n8nNode.name ?? n8nNode.id;
		const instance: NodeInstance<string, string, unknown> = {
			type: n8nNode.type,
			version,
			id: n8nNode.id,
			name: nodeName,
			config: {
				name: nodeName,
				parameters: n8nNode.parameters as IDataObject,
				credentials,
				...({ _originalName: n8nNode.name } as Record<string, unknown>),
				position: n8nNode.position,
				disabled: n8nNode.disabled,
				notes: n8nNode.notes,
				notesInFlow: n8nNode.notesInFlow,
				executeOnce: n8nNode.executeOnce,
				retryOnFail: n8nNode.retryOnFail,
				alwaysOutputData: n8nNode.alwaysOutputData,
				onError: n8nNode.onError,
			},
			update(config) {
				return { ...this, config: { ...this.config, ...config } };
			},
			to() {
				throw new Error('Nodes from fromJSON() do not support to()');
			},
			input() {
				throw new Error('Nodes from fromJSON() do not support input()');
			},
			output() {
				throw new Error('Nodes from fromJSON() do not support output()');
			},
			onError() {
				throw new Error('Nodes from fromJSON() do not support onError()');
			},
			getConnections() {
				return [];
			},
		};

		const connectionsMap = new Map<string, Map<number, ConnectionTarget[]>>();
		const mapKey = nodeName || `__unnamed_${unnamedCounter++}`;
		nameToKey.set(nodeName, mapKey);

		nodes.set(mapKey, {
			instance,
			connections: connectionsMap,
		});
	}

	// Rebuild connections
	if (json.connections) {
		for (const [sourceName, nodeConns] of Object.entries(json.connections)) {
			const mapKey = nameToKey.get(sourceName);
			const graphNode = mapKey ? nodes.get(mapKey) : undefined;
			if (!graphNode) continue;

			for (const [connType, outputs] of Object.entries(nodeConns)) {
				if (!outputs || !Array.isArray(outputs)) continue;

				const typeMap =
					graphNode.connections.get(connType) ?? new Map<number, ConnectionTarget[]>();

				for (let outputIndex = 0; outputIndex < outputs.length; outputIndex++) {
					const targets = outputs[outputIndex];
					if (targets && targets.length > 0) {
						typeMap.set(
							outputIndex,
							targets.map((conn: { node: string; type: string; index: number }) => ({
								node: conn.node,
								type: conn.type,
								index: conn.index,
							})),
						);
					} else {
						typeMap.set(outputIndex, []);
					}
				}

				graphNode.connections.set(connType, typeMap);
			}
		}
	}

	let lastNode: string | null = null;
	for (const name of nodes.keys()) {
		lastNode = name;
	}

	return {
		id: json.id ?? '',
		name: json.name,
		settings: json.settings,
		nodes,
		lastNode,
		pinData: json.pinData,
		meta: json.meta,
	};
}
