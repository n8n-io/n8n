/**
 * Public DTOs for the MCP registry served at `/rest/mcp-registry/*`.
 *
 * Mirrors the subset of `McpRegistryServer` (in `packages/cli`) that we want
 * to surface to authenticated users. Internal fields like `remotes` (transport
 * endpoint URLs) and `origin` are intentionally omitted.
 */

export type McpRegistryServerStatus = 'active' | 'deprecated';

export type McpRegistryServerIconResponse = {
	src: string;
	mimeType?: 'image/png' | 'image/jpeg' | 'image/jpg' | 'image/svg+xml' | 'image/webp';
	theme?: 'light' | 'dark';
};

export type McpRegistryServerToolResponse = {
	name: string;
	title?: string;
	annotations?: {
		readOnlyHint?: boolean;
	};
};

export interface McpRegistryServerResponse {
	slug: string;
	name: string;
	title: string;
	description: string;
	tagline: string;
	version: string;
	updatedAt: string;
	icons: McpRegistryServerIconResponse[];
	websiteUrl?: string;
	authType: 'oauth2';
	tools: McpRegistryServerToolResponse[];
	isOfficial: boolean;
	status: McpRegistryServerStatus;
	tags?: string[];
}
