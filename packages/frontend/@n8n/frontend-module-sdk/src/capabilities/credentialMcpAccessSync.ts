import { declareCapability } from '../declareCapability';
import type { CredentialMcpAccessSync } from '../types/capability';

/**
 * Writes an MCP access toggle back into the shell's credentials store, so the
 * list and the open credential agree with the server without a refetch.
 *
 * Provided by the shell in `capabilities.manifest.ts`.
 */
export const credentialMcpAccessSync = declareCapability<CredentialMcpAccessSync>(
	'credential-mcp-access-sync',
);
