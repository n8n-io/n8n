/**
 * Pin Data Utility Functions
 *
 * Functions for determining which nodes should have pin data generated.
 */

import { isHttpRequestType, isWebhookType, isDataTableType } from '../constants/node-types';
import type { NodeInstance } from '../types/base';

/**
 * Check if a node or any of its subnodes have a newCredential() marker.
 * Nodes with new credentials need pin data to avoid execution errors.
 */
export function hasNewCredential(node: NodeInstance<string, string, unknown>): boolean {
	// Check main node credentials
	const creds = node.config?.credentials;
	if (creds) {
		const hasNew = Object.values(creds).some(
			(cred) => cred && typeof cred === 'object' && '__newCredential' in cred,
		);
		if (hasNew) return true;
	}

	// Check subnode credentials recursively
	const subnodes = node.config?.subnodes;
	if (subnodes) {
		for (const value of Object.values(subnodes)) {
			if (!value) continue;
			// Handle both single subnodes and arrays
			const subnodeArray = Array.isArray(value) ? value : [value];
			for (const subnode of subnodeArray) {
				// Subnodes have a config property with credentials and potentially nested subnodes
				if (subnode && typeof subnode === 'object' && 'config' in subnode) {
					if (hasNewCredential(subnode as NodeInstance<string, string, unknown>)) {
						return true;
					}
				}
			}
		}
	}

	return false;
}

/**
 * Check if the node type is HTTP Request or Webhook.
 * These nodes typically need pin data for testing.
 */
export function isHttpRequestOrWebhook(type: string): boolean {
	return isHttpRequestType(type) || isWebhookType(type);
}

/**
 * Check if the node is a Data Table node without a table configured.
 * These nodes need pin data to provide sample data during testing.
 */
export function isDataTableWithoutTable(node: NodeInstance<string, string, unknown>): boolean {
	if (!isDataTableType(node.type)) {
		return false;
	}

	// Check if dataTableId parameter has a value
	const params = node.config?.parameters as Record<string, unknown> | undefined;
	const dataTableId = params?.dataTableId as { value?: unknown } | undefined;

	// No table configured if dataTableId is missing or has empty value
	if (!dataTableId?.value) {
		return true;
	}

	// Check if value is a placeholder (user needs to fill in)
	if (
		typeof dataTableId.value === 'object' &&
		dataTableId.value !== null &&
		'__placeholder' in dataTableId.value
	) {
		return true;
	}

	return false;
}

/**
 * Determine if a node should have pin data generated.
 *
 * Pin data should be generated for nodes that:
 * 1. Have newCredential() in credentials (or subnodes)
 * 2. Are HTTP Request or Webhook nodes
 * 3. Are Data Table nodes without a table configured
 */
export function shouldGeneratePinData(node: NodeInstance<string, string, unknown>): boolean {
	return (
		hasNewCredential(node) || isHttpRequestOrWebhook(node.type) || isDataTableWithoutTable(node)
	);
}
