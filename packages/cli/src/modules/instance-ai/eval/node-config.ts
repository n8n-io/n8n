/**
 * Node configuration extractor for eval mock prompts.
 *
 * Serializes node.parameters as JSON for LLM context.
 */

import type { INode } from 'n8n-workflow';

import { redactNodeParameters, redactSecretValuePatterns } from './request-sanitizer';

export function extractNodeConfig(node: INode): string {
	const params = node.parameters;
	if (!params || typeof params !== 'object') return '';

	try {
		return JSON.stringify(params);
	} catch {
		return '';
	}
}

/** The configuration of a node for a prompt that goes to a model, with the secrets removed. */
export function extractRedactedNodeConfig(node: INode): string {
	const params = node.parameters;
	if (!params || typeof params !== 'object') return '';

	try {
		return redactSecretValuePatterns(JSON.stringify(redactNodeParameters(params)));
	} catch {
		return '';
	}
}
