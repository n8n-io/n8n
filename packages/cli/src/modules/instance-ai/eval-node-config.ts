/**
 * Node configuration extractor for eval mock prompts.
 *
 * Serializes node.parameters as JSON for LLM context.
 */

import type { INode } from 'n8n-workflow';

export function extractNodeConfig(node: INode): string {
	const params = node.parameters;
	if (!params || typeof params !== 'object') return '';

	try {
		return JSON.stringify(params);
	} catch {
		return '';
	}
}
