/**
 * Public DTOs for the MCP registry served at `/rest/mcp-registry/*`.
 *
 * Mirrors the subset of `McpRegistryServer` (in `packages/cli`) that we want
 * to surface to authenticated users. Internal fields like `remotes` (transport
 * endpoint URLs) and `origin` are intentionally omitted.
 */
import { z } from 'zod';

export type McpRegistryServerStatus = 'active' | 'deprecated';

export type McpRegistryServerIconResponse = {
	src: string;
	mimeType?: 'image/png' | 'image/jpeg' | 'image/jpg' | 'image/svg+xml' | 'image/webp';
	theme?: 'light' | 'dark';
};

export type McpRegistryServerToolResponse = {
	name: string;
	title?: string;
};

export interface McpRegistryCredentialOption {
	credentialType: string;
	name: string;
	value: string;
}

export interface McpRegistryServerResponse {
	slug: string;
	nodeTypeName: string;
	name: string;
	title: string;
	description: string;
	tagline: string;
	version: string;
	updatedAt: string;
	icons: McpRegistryServerIconResponse[];
	websiteUrl?: string;
	credentials: McpRegistryCredentialOption[];
	tools: McpRegistryServerToolResponse[];
	isOfficial: boolean;
	status: McpRegistryServerStatus;
	tags?: string[];
}

export const mcpRegistryDiscoveryRequestSchema = z
	.object({
		slug: z.string().trim().min(1),
		credentialId: z.string().trim().min(1),
	})
	.strict();

export type McpRegistryDiscoveryRequest = z.infer<typeof mcpRegistryDiscoveryRequestSchema>;

export type McpRegistryDiscoveredTool = {
	name: string;
	description?: string;
	category: 'read' | 'write';
};

export type McpRegistryDiscoveredConnection = {
	url: string;
	transport: 'sse' | 'streamableHttp';
	authentication: string;
	credentialId?: string;
	metadata?: { nodeTypeName: string };
};

export type McpRegistryDiscoveryFailureReason = 'authentication' | 'server_unavailable' | 'unknown';

export type McpRegistryDiscoveryResponse =
	| {
			status: 'connected';
			connection: McpRegistryDiscoveredConnection;
			tools: McpRegistryDiscoveredTool[];
	  }
	| {
			status: 'disconnected';
			failureReason: McpRegistryDiscoveryFailureReason;
			tools: [];
	  };
