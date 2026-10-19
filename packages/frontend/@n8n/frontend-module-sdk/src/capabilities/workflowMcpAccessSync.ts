import { declareCapability } from '../declareCapability';

/**
 * Writes an MCP access toggle back into the shell's workflow stores, so the list
 * and the open document agree with the server without a refetch.
 *
 * Provided by the shell in `capabilities.manifest.ts`.
 */
export const workflowMcpAccessSync = declareCapability<(ids: string[], enabled: boolean) => void>(
	'workflow-mcp-access-sync',
);
