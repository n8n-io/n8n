/**
 * The shape of an entry returned by the MCP server registry.
 */
export type McpRegistryServer = {
	id: number;
	name: string;
	slug: string;
	title: string;
	description: string;
	version: string;
	icons: McpRegistryIcon[];
	websiteUrl?: string;
	authType: 'oauth2';
	remotes: McpRegistryRemote[];
	tools: McpRegistryTool[];
	isOfficial: boolean;
	origin: 'registry';
	status: 'active' | 'deprecated';
	tags?: string[];
};

export type McpRegistryIcon = {
	src: string;
	mimeType?: 'image/png' | 'image/jpeg' | 'image/jpg' | 'image/svg+xml' | 'image/webp';
	sizes?: string[];
	theme?: 'light' | 'dark';
};

export type McpRegistryRemoteType = 'streamable-http' | 'sse';

export type McpRegistryRemote = {
	type: McpRegistryRemoteType;
	url: string;
};

export type McpRegistryToolAnnotations = {
	readOnlyHint?: boolean;
	destructiveHint?: boolean;
};

export type McpRegistryTool = {
	name: string;
	title?: string;
	description: string;
	annotations?: McpRegistryToolAnnotations;
};
