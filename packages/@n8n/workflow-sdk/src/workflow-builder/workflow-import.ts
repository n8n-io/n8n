/**
 * Workflow Import Utility
 *
 * Parses n8n JSON format into internal graph structures.
 */

import { deepCopy } from 'n8n-workflow';

import {
	foldLegacyErrorConnections,
	normalizeConnections,
	generateUniqueName,
	type WorkflowJSON,
	type NodeInstance,
	type GraphNode,
	type ConnectionTarget,
	type IDataObject,
	type CredentialReference,
	type NewCredentialValue,
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
	/** Node groups reconstructed by mapping the JSON's member IDs back to node handles. */
	readonly nodeGroups?: Array<{
		/** Source group ID from the JSON. */
		id?: string;
		name: string;
		members: Array<NodeInstance<string, string, unknown>>;
	}>;
}

/**
 * Parse workflow JSON into internal graph structures.
 * This is a pure function that doesn't depend on WorkflowBuilderImpl.
 */
export function parseWorkflowJSON(json: WorkflowJSON): ParsedWorkflow {
	const nodes = new Map<string, GraphNode>();
	// Map from connection name (how nodes reference each other) to map key
	const nameToKey = new Map<string, string>();
	// Map from n8n node ID to the created node handle, used to rebuild groups (which
	// reference members by ID) as node refs — the same shape `.group()` authoring uses.
	const idToInstance = new Map<string, NodeInstance<string, string, unknown>>();

	// Create node instances from JSON (shallow-clone each node to avoid mutating the input)
	let unnamedCounter = 0;
	for (const rawNode of json.nodes) {
		const n8nNode = { ...rawNode };
		// Normalize typeVersion to number (some workflows store it as a string)
		if (typeof n8nNode.typeVersion === 'string') {
			n8nNode.typeVersion = Number(n8nNode.typeVersion);
		}
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
				webhookId: n8nNode.webhookId,
				disabled: n8nNode.disabled,
				notes: n8nNode.notes,
				notesInFlow: n8nNode.notesInFlow,
				executeOnce: n8nNode.executeOnce,
				retryOnFail: n8nNode.retryOnFail,
				maxTries: n8nNode.maxTries,
				waitBetweenTries: n8nNode.waitBetweenTries,
				alwaysOutputData: n8nNode.alwaysOutputData,
				onError: n8nNode.onError,
				extendsCredential: n8nNode.extendsCredential,
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
		let mapKey = nodeName || `__unnamed_${unnamedCounter++}`;

		// Handle duplicate node names: generate unique key for duplicates
		// The first instance keeps the original name (connections reference it)
		if (nodes.has(mapKey)) {
			mapKey = generateUniqueName(nodeName, (n) => nodes.has(n));
		} else {
			nameToKey.set(nodeName, mapKey);
		}

		nodes.set(mapKey, {
			instance,
			connections: connectionsMap,
		});

		// Groups reference members by ID; record ID → handle so we can carry groups as
		// node refs (resolved back to IDs in toJSON, exactly like authored groups).
		if (n8nNode.id) idToInstance.set(n8nNode.id, instance);
	}

	// Rebuild connections (deep-clone to avoid mutating the input)
	if (json.connections) {
		const connections = deepCopy(json.connections);
		normalizeConnections(connections);
		foldLegacyErrorConnections(connections, json.nodes);

		for (const [sourceName, nodeConns] of Object.entries(connections)) {
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

	// Rebuild groups by mapping each member ID back to its node handle (unresolvable IDs
	// are dropped). The group's `id` is carried through so a round-trip preserves it.
	const nodeGroups = json.nodeGroups?.length
		? json.nodeGroups.map((group) => ({
				id: group.id,
				name: group.name,
				members: group.nodeIds.flatMap((id) => {
					const instance = idToInstance.get(id);
					return instance !== undefined ? [instance] : [];
				}),
			}))
		: undefined;

	return {
		id: json.id ?? '',
		name: json.name,
		settings: json.settings,
		nodes,
		lastNode,
		pinData: json.pinData,
		meta: json.meta,
		nodeGroups,
	};
}
