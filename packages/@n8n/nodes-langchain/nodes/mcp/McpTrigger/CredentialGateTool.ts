import { DynamicStructuredTool, type Tool } from '@langchain/core/tools';
import type { CredentialCheckResult } from 'n8n-workflow';
import { z } from 'zod';

export const CONNECT_CREDENTIALS_TOOL_NAME = 'connect_credentials';

/**
 * Placeholder tool exposed when the trigger's tool list cannot be built because
 * the calling user has not connected one or more required credentials (building
 * the list eagerly connects MCP Client sub-nodes, which fails without them).
 *
 * It keeps session setup and tools/list working instead of failing with a masked
 * webhook error, and gives the caller something to invoke: the pre-execution
 * credential gate intercepts the call and returns personal connection links
 * (via URL elicitation when supported, otherwise as text).
 */
export function createCredentialGateTool(gateResult: CredentialCheckResult): Tool {
	const missing = gateResult.credentials
		.filter((c) => c.status !== 'configured')
		.map((c) => `${c.credentialName} (${c.credentialType})`);

	const tool = new DynamicStructuredTool({
		name: CONNECT_CREDENTIALS_TOOL_NAME,
		description: [
			'The tools of this MCP server are unavailable because required credentials are not connected for your account yet:',
			...missing.map((label) => `- ${label}`),
			'Call this tool to receive personal connection links, then reconnect to see the available tools.',
		].join('\n'),
		schema: z.object({}),
		// The credential gate intercepts calls to this tool before it executes; this
		// only runs if the credentials got connected between listing and calling.
		func: async () =>
			await Promise.resolve(
				'Credentials are now connected. List the tools again to see the available tools.',
			),
	});

	// The package treats langchain structured tools as `Tool` throughout (see
	// normalizeToolSchema in @utils/helpers); only name/description/schema are used.
	return tool as unknown as Tool;
}
