/**
 * JSON Serializer Plugin
 *
 * Serializes workflows to n8n's standard JSON format.
 */

import { deepCopy } from 'n8n-workflow';

import type {
	WorkflowJSON,
	NodeJSON,
	IConnections,
	IDataObject,
	GraphNode,
} from '../../../types/base';
import { START_X, DEFAULT_Y } from '../../constants';
import { calculateNodePositions } from '../../layout-utils';
import {
	normalizeResourceLocators,
	escapeNewlinesInExpressionStrings,
	parseVersion,
} from '../../string-utils';
import type { SerializerPlugin, SerializerContext } from '../types';

/**
 * Serialize a single node to NodeJSON format.
 */
function serializeNode(
	mapKey: string,
	graphNode: GraphNode,
	nodePositions: Map<string, [number, number]>,
): NodeJSON | undefined {
	const instance = graphNode.instance;

	// Skip invalid nodes (shouldn't happen, but defensive)
	if (!instance?.name || !instance.type) {
		return undefined;
	}

	const config = instance.config ?? {};
	const position = config.position ?? nodePositions.get(mapKey) ?? [START_X, DEFAULT_Y];

	// Determine node name:
	// - If config has _originalName, use that (preserves undefined for sticky notes from fromJSON)
	// - If mapKey was auto-renamed (e.g., "Process 1" from "Process"), use mapKey
	// - Otherwise use instance.name (preserves original name for fromJSON imports)
	let nodeName: string | undefined;
	if ('_originalName' in config) {
		// Node was loaded via fromJSON - preserve original name (may be undefined)
		nodeName = config._originalName as string | undefined;
	} else {
		// Node was created via builder - use auto-renamed key if applicable
		const isAutoRenamed =
			mapKey !== instance.name &&
			mapKey.startsWith(instance.name + ' ') &&
			/^\d+$/.test(mapKey.slice(instance.name.length + 1));
		nodeName = isAutoRenamed ? mapKey : instance.name;
	}

	// Check if this node was loaded via fromJSON (has _originalName marker)
	const isFromJson = '_originalName' in config;

	// Serialize parameters - for SDK-created nodes, also normalize resource locators
	// (add __rl: true if missing) and escape newlines in expression strings.
	// For fromJSON nodes, preserve parameters as-is.
	let serializedParams: IDataObject | undefined;
	if (config.parameters) {
		const parsed = deepCopy(config.parameters);
		if (isFromJson) {
			serializedParams = parsed;
		} else {
			const normalized = normalizeResourceLocators(parsed);
			serializedParams = escapeNewlinesInExpressionStrings(normalized) as IDataObject;
		}
	}

	const n8nNode: NodeJSON = {
		id: instance.id,
		name: nodeName,
		type: instance.type,
		typeVersion: parseVersion(instance.version),
		position,
		parameters: serializedParams,
	};

	// Add optional properties
	if (config.credentials) {
		// Serialize credentials to ensure newCredential() markers are converted to JSON
		n8nNode.credentials = deepCopy(config.credentials);
	}
	if (config.disabled) {
		n8nNode.disabled = config.disabled;
	}
	if (config.notes) {
		n8nNode.notes = config.notes;
	}
	if (config.notesInFlow) {
		n8nNode.notesInFlow = config.notesInFlow;
	}
	if (config.executeOnce) {
		n8nNode.executeOnce = config.executeOnce;
	}
	if (config.retryOnFail) {
		n8nNode.retryOnFail = config.retryOnFail;
	}
	if (config.alwaysOutputData) {
		n8nNode.alwaysOutputData = config.alwaysOutputData;
	}
	if (config.onError) {
		n8nNode.onError = config.onError;
	}

	return n8nNode;
}

/**
 * Serialize connections for a single node.
 */
function serializeNodeConnections(
	graphNode: GraphNode,
	nodeName: string | undefined,
): IConnections[string] | undefined {
	// Check if node has any connections
	let hasConnections = false;
	for (const typeConns of graphNode.connections.values()) {
		if (typeConns.size > 0) {
			hasConnections = true;
			break;
		}
	}

	if (!hasConnections || nodeName === undefined) {
		return undefined;
	}

	const nodeConnections: IConnections[string] = {};

	for (const [connType, outputMap] of graphNode.connections) {
		if (outputMap.size === 0) continue;

		// Get max output index to ensure array is properly sized
		const maxOutput = Math.max(...outputMap.keys());
		const outputArray: Array<Array<{ node: string; type: string; index: number }>> = [];

		for (let i = 0; i <= maxOutput; i++) {
			const targets = outputMap.get(i) ?? [];
			outputArray[i] = targets.map((target) => ({
				node: target.node,
				type: target.type,
				index: target.index,
			}));
		}

		nodeConnections[connType] = outputArray;
	}

	if (Object.keys(nodeConnections).length === 0) {
		return undefined;
	}

	return nodeConnections;
}

/**
 * Serializer for the standard n8n workflow JSON format.
 *
 * Produces WorkflowJSON output that can be imported into n8n.
 */
export const jsonSerializer: SerializerPlugin<WorkflowJSON> = {
	id: 'core:json',
	name: 'JSON Serializer',
	format: 'json',

	serialize(ctx: SerializerContext): WorkflowJSON {
		const nodes: NodeJSON[] = [];
		const connections: IConnections = {};

		// Calculate positions for nodes without explicit positions
		const nodePositions = calculateNodePositions(ctx.nodes);

		// Convert nodes and connections
		for (const [mapKey, graphNode] of ctx.nodes) {
			// Serialize node
			const serializedNode = serializeNode(mapKey, graphNode, nodePositions);
			if (!serializedNode) continue;

			nodes.push(serializedNode);

			// Serialize connections
			const nodeName = serializedNode.name;
			const nodeConns = serializeNodeConnections(graphNode, nodeName);
			if (nodeConns && nodeName !== undefined) {
				connections[nodeName] = nodeConns;
			}
		}

		// Build the workflow JSON
		const json: WorkflowJSON = {
			id: ctx.workflowId,
			name: ctx.workflowName,
			nodes,
			connections,
		};

		// Preserve settings even if empty (for round-trip fidelity)
		if (ctx.settings !== undefined) {
			json.settings = ctx.settings;
		}

		if (ctx.pinData && Object.keys(ctx.pinData).length > 0) {
			json.pinData = ctx.pinData;
		}

		if (ctx.meta) {
			json.meta = ctx.meta;
		}

		return json;
	},
};
