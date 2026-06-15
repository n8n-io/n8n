/**
 * Node type utility functions for code generation
 */

import { isWebhookType, isStickyNoteType, isMergeNodeType } from '../constants/node-types';

/**
 * Check if node is a trigger type
 */
export function isTriggerType(type: string): boolean {
	return type.toLowerCase().includes('trigger') || isWebhookType(type);
}

/**
 * Check if node is a sticky note
 */
export function isStickyNote(type: string): boolean {
	return isStickyNoteType(type);
}

/**
 * Check if node is a merge type
 */
export function isMergeType(type: string): boolean {
	return isMergeNodeType(type);
}

/**
 * Generate the default node name from a node type
 * e.g., 'n8n-nodes-base.httpRequest' -> 'HTTP Request'
 */
export function generateDefaultNodeName(type: string): string {
	const parts = type.split('.');
	const nodeName = parts[parts.length - 1];

	return nodeName
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
		.replace(/^./, (str) => str.toUpperCase())
		.replace(/Http/g, 'HTTP')
		.replace(/Api/g, 'API')
		.replace(/Url/g, 'URL')
		.replace(/Id/g, 'ID')
		.replace(/Json/g, 'JSON')
		.replace(/Xml/g, 'XML')
		.replace(/Sql/g, 'SQL')
		.replace(/Ai/g, 'AI')
		.replace(/Aws/g, 'AWS')
		.replace(/Gcp/g, 'GCP')
		.replace(/Ssh/g, 'SSH')
		.replace(/Ftp/g, 'FTP')
		.replace(/Csv/g, 'CSV');
}
