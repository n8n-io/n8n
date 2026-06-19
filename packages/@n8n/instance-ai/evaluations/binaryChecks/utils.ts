// ---------------------------------------------------------------------------
// Shared utilities for binary checks
// ---------------------------------------------------------------------------

import type { WorkflowNodeResponse } from '../clients/n8n-client';

// ---------------------------------------------------------------------------
// Node type constants
// ---------------------------------------------------------------------------

export const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';
export const SET_NODE_TYPE = 'n8n-nodes-base.set';
export const AGENT_TYPE = '@n8n/n8n-nodes-langchain.agent';
export const HTTP_REQUEST_TYPE = 'n8n-nodes-base.httpRequest';

// ---------------------------------------------------------------------------
// Trigger detection
// ---------------------------------------------------------------------------

const TRIGGER_SUFFIX = 'Trigger';

const KNOWN_TRIGGER_TYPES = new Set([
	'n8n-nodes-base.manualTrigger',
	'n8n-nodes-base.scheduleTrigger',
	'n8n-nodes-base.start',
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.formTrigger',
	'@n8n/n8n-nodes-langchain.chatTrigger',
	'@n8n/n8n-nodes-langchain.mcpTrigger',
]);

export function isTriggerNode(type: string): boolean {
	if (KNOWN_TRIGGER_TYPES.has(type)) return true;
	const shortName = type.split('.').pop() ?? '';
	return shortName.endsWith(TRIGGER_SUFFIX);
}

// ---------------------------------------------------------------------------
// Connection traversal
// ---------------------------------------------------------------------------

interface ConnectionLink {
	node: string;
	type?: string;
	index?: number;
}

/**
 * Iterate all connections in a workflow, calling `visitor` for each link.
 * Handles the n8n format: `{ [source]: { [connType]: [ [ { node, type, index } ] ] } }`
 */
export function forEachConnection(
	connections: Record<string, unknown>,
	visitor: (source: string, connectionType: string, link: ConnectionLink) => void,
): void {
	for (const [sourceName, outputs] of Object.entries(connections)) {
		if (typeof outputs !== 'object' || outputs === null) continue;

		for (const [connType, connectionGroup] of Object.entries(outputs)) {
			if (!Array.isArray(connectionGroup)) continue;
			for (const outputSlot of connectionGroup) {
				if (!Array.isArray(outputSlot)) continue;
				for (const link of outputSlot) {
					if (typeof link === 'object' && link !== null && 'node' in link) {
						visitor(sourceName, connType, link as ConnectionLink);
					}
				}
			}
		}
	}
}

/**
 * Recursively extract all expression strings from node parameters.
 * An expression is a string starting with `=`, or the body of a `jsCode` field.
 */
export function extractExpressionsFromParams(value: unknown, key?: string): string[] {
	if (typeof value === 'string') {
		if (value.charAt(0) === '=' || key === 'jsCode') {
			return [value];
		}
		return [];
	}

	if (Array.isArray(value)) {
		return value.flatMap((item) => extractExpressionsFromParams(item));
	}

	if (typeof value === 'object' && value !== null) {
		return Object.entries(value).flatMap(([k, v]) => extractExpressionsFromParams(v, k));
	}

	return [];
}

/**
 * Collect all target node names that receive a specific connection type.
 */
export function collectTargetsByConnectionType(
	connections: Record<string, unknown>,
	connectionType: string,
): Set<string> {
	const targets = new Set<string>();
	forEachConnection(connections, (_source, connType, link) => {
		if (connType === connectionType) targets.add(link.node);
	});
	return targets;
}

/**
 * Collect all source node names that emit a specific connection type.
 */
export function collectSourcesByConnectionType(
	connections: Record<string, unknown>,
	connectionType: string,
): Set<string> {
	const sources = new Set<string>();
	forEachConnection(connections, (source, connType) => {
		if (connType === connectionType) sources.add(source);
	});
	return sources;
}

/**
 * Collect all node names that appear in the connections graph (as source or target).
 */
export function collectAllConnectedNodes(connections: Record<string, unknown>): Set<string> {
	const connected = new Set<string>();
	forEachConnection(connections, (source, _connType, link) => {
		connected.add(source);
		connected.add(link.node);
	});
	return connected;
}

/**
 * Filter workflow nodes, excluding sticky notes.
 */
export function getActiveNodes(nodes: WorkflowNodeResponse[]): WorkflowNodeResponse[] {
	return nodes.filter((n) => n.type !== STICKY_NOTE_TYPE);
}
