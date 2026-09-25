import { declareCapability } from '../declareCapability';

/**
 * Writes an MCP access toggle back into the shell's workflow stores, so the list
 * and the open document agree with the server without a refetch.
 *
 * Declared ahead of its provider: the shell provides it when the MCP feature
 * moves into its own module package.
 */
export const workflowMcpAccessSync = declareCapability<(ids: string[], enabled: boolean) => void>(
	'workflow-mcp-access-sync',
);
