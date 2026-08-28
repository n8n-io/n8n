import { z } from 'zod';

import type { McpRegistryServerEntity } from './mcp-registry-server.entity';

type McpRegistryServerUpsertRow = Pick<
	McpRegistryServerEntity,
	'slug' | 'status' | 'version' | 'registryUpdatedAt' | 'data'
>;

const serverStatuses = ['active', 'deprecated'] as const;

type McpRegistryServerStatus = (typeof serverStatuses)[number];

/**
 * Override values for the credential identified by `extends`. Only properties
 * defined on `oAuth2Api`/`mcpOAuth2Api` are accepted; `null`/missing values are
 * treated as "no override" and dropped before the synthetic credential is built.
 */
export const mcpRegistryExtendsCredentialSchema = z.object({
	extends: z.string(),
	authUrl: z.string().nullish(),
	accessTokenUrl: z.string().nullish(),
	scope: z.string().nullish(),
	authQueryParameters: z.string().nullish(),
	grantType: z.enum(['authorizationCode', 'clientCredentials', 'pkce']).nullish(),
	authentication: z.enum(['body', 'header']).nullish(),
	useDynamicClientRegistration: z.boolean().nullish(),
	serverUrl: z.string().nullish(),
});

export type McpRegistryExtendsCredential = z.infer<typeof mcpRegistryExtendsCredentialSchema>;

/**
 * The shape of an entry returned by the MCP server registry.
 */
export type McpRegistryServer = {
	name: string;
	slug: string;
	title: string;
	description: string;
	tagline: string;
	version: string;
	updatedAt: string;
	icons: McpRegistryIcon[];
	websiteUrl?: string;
	authType: 'oauth2' | 'extendsCredential';
	remotes: McpRegistryRemote[];
	tools: McpRegistryTool[];
	isOfficial: boolean;
	origin: 'registry';
	status: McpRegistryServerStatus;
	// FIXME: api returns {data?: string[]} not string[]
	tags?: string[];
	extendsCredential?: McpRegistryExtendsCredential;
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
	const { slug, status, version, updatedAt, ...rest } = server;
	let mappedStatus = status;
	// make sure that unknown statuses get mapped to a valid value
	if (!serverStatuses.includes(status)) {
		mappedStatus = 'deprecated';
	}

	return {
		slug,
		status: mappedStatus,
		version,
		registryUpdatedAt: new Date(updatedAt),
		data: rest,
	};
}

export function fromEntity(entity: McpRegistryServerEntity): McpRegistryServer {
	const { slug, status, version, registryUpdatedAt, data } = entity;
	return {
		slug,
		status,
		version,
		updatedAt: registryUpdatedAt.toISOString(),
		...data,
	} as McpRegistryServer;
}
