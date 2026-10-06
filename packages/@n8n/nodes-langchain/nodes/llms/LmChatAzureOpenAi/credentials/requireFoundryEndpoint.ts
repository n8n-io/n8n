import { NodeOperationError, type INode } from 'n8n-workflow';

import { normalizeEndpoint } from './normalizeEndpoint';

/**
 * A Foundry credential carries the inference base URL directly, unlike
 * Classic's resource name. Every call site that needs it validates the same
 * way, so the check lives here once.
 */
export function requireFoundryEndpoint(node: INode, foundryEndpoint: string | undefined): string {
	const endpoint = normalizeEndpoint(foundryEndpoint);
	if (!endpoint) {
		throw new NodeOperationError(
			node,
			'Foundry endpoint is missing in the selected Azure OpenAI credential.',
		);
	}
	return endpoint;
}
