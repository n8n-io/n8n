import type { McpRegistryServerEntity } from './mcp-registry-server.entity';

type McpRegistryServerUpsertRow = Pick<
	McpRegistryServerEntity,
	'id' | 'slug' | 'status' | 'version' | 'registryUpdatedAt' | 'data'
>;

const serverStatuses = ['active', 'deprecated'] as const;

type McpRegistryServerStatus = (typeof serverStatuses)[number];

export const mcpRegistryServerSupportedCredentialTypes = [
	'googleCalendarOAuth2Api',
	'googleDriveOAuth2Api',
	'gmailOAuth2',
	'jiraSoftwareCloudOAuth2Api',
] as const;

export type McpRegistryServerAuthType =
	| 'oauth2'
	| (typeof mcpRegistryServerSupportedCredentialTypes)[number];

/**
 * The shape of an entry returned by the MCP server registry.
 */
export type McpRegistryServer = {
	id: number;
	name: string;
	slug: string;
	title: string;
	description: string;
	tagline: string;
	version: string;
	updatedAt: string;
	icons: McpRegistryIcon[];
	websiteUrl?: string;
	authType: McpRegistryServerAuthType;
	remotes: McpRegistryRemote[];
	tools: McpRegistryTool[];
	isOfficial: boolean;
	origin: 'registry';
	status: McpRegistryServerStatus;
	tags?: string[];
};

export type McpRegistryIcon = {
	src: string;
	mimeType?: 'image/png' | 'image/jpeg' | 'image/jpg' | 'image/svg+xml' | 'image/webp';
	theme?: 'light' | 'dark';
};

export type McpRegistryRemoteType = 'streamable-http' | 'sse';

export type McpRegistryRemote = {
	type: McpRegistryRemoteType;
	url: string;
};

export type McpRegistryToolAnnotations = {
	readOnlyHint?: boolean;
};

export type McpRegistryTool = {
	name: string;
	title?: string;
	annotations?: McpRegistryToolAnnotations;
};

export function toEntity(server: McpRegistryServer): McpRegistryServerUpsertRow {
	const { id, slug, status, version, updatedAt, ...rest } = server;
	let mappedStatus = status;
	// make sure that unknown statuses get mapped to a valid value
	if (!serverStatuses.includes(status)) {
		mappedStatus = 'deprecated';
	}

	return {
		id,
		slug,
		status: mappedStatus,
		version,
		registryUpdatedAt: new Date(updatedAt),
		data: rest,
	};
}

export function fromEntity(entity: McpRegistryServerEntity): McpRegistryServer {
	const { id, slug, status, version, registryUpdatedAt, data } = entity;
	return {
		id,
		slug,
		status,
		version,
		updatedAt: registryUpdatedAt.toISOString(),
		...data,
	} as McpRegistryServer;
}
