import { z } from 'zod';

import type { McpRegistryServerEntity } from './mcp-registry-server.entity';

type McpRegistryServerUpsertRow = Pick<
	McpRegistryServerEntity,
	'slug' | 'status' | 'version' | 'registryUpdatedAt' | 'data'
>;

const serverStatuses = ['active', 'deprecated'] as const;

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

export const mcpRegistryUsesCredentialSchema = z.object({
	credentialType: z.string().min(1),
	name: z.string().min(1),
	value: z.string().min(1),
	default: z.boolean().optional(),
});

export const mcpRegistryUsesCredentialsSchema = z
	.array(mcpRegistryUsesCredentialSchema)
	.min(1)
	.superRefine((credentials, ctx) => {
		const credentialTypes = new Set<string>();
		const values = new Set<string>();

		for (const [index, credential] of credentials.entries()) {
			if (credentialTypes.has(credential.credentialType)) {
				ctx.addIssue({
					code: 'custom',
					message: 'Credential types must be unique',
					path: [index, 'credentialType'],
				});
			}
			if (values.has(credential.value)) {
				ctx.addIssue({
					code: 'custom',
					message: 'Credential selector values must be unique',
					path: [index, 'value'],
				});
			}
			credentialTypes.add(credential.credentialType);
			values.add(credential.value);
		}

		if (credentials.filter((credential) => credential.default === true).length > 1) {
			ctx.addIssue({
				code: 'custom',
				message: 'Only one credential can be the default',
			});
		}
	});

export type McpRegistryUsesCredential = z.infer<typeof mcpRegistryUsesCredentialSchema>;

const mcpRegistryServerBaseSchema = z.object({
	name: z.string(),
	slug: z.string(),
	title: z.string(),
	description: z.string(),
	tagline: z.string(),
	version: z.string(),
	updatedAt: z.string(),
	icons: z.array(
		z.object({
			src: z.string(),
			mimeType: z
				.enum(['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'])
				.optional(),
			theme: z.enum(['light', 'dark']).optional(),
		}),
	),
	websiteUrl: z
		.string()
		.nullish()
		.transform((value) => value ?? undefined),
	remotes: z.array(
		z.object({
			type: z.enum(['streamable-http', 'sse']),
			url: z.string(),
		}),
	),
	tools: z.array(
		z.object({
			name: z.string(),
			title: z.string().optional(),
			annotations: z.object({ readOnlyHint: z.boolean().optional() }).optional(),
		}),
	),
	isOfficial: z.boolean(),
	origin: z.literal('registry'),
	status: z.enum(serverStatuses),
	// The API returns either a bare array or a `{ data }` envelope, and omits
	// `data` entirely when there are no tags. Anything stricter drops the whole
	// server over optional metadata.
	tags: z
		.union([z.array(z.string()), z.object({ data: z.array(z.string()).nullish() })])
		.nullish()
		.transform((value) => (Array.isArray(value) ? value : (value?.data ?? undefined))),
	authType: z.enum(['oauth2', 'extendsCredential', 'usesCredentials']),
	extendsCredential: mcpRegistryExtendsCredentialSchema
		.nullish()
		.transform((value) => value ?? undefined),
	usesCredentials: mcpRegistryUsesCredentialsSchema
		.nullish()
		.transform((value) => value ?? undefined),
	packagePrerequisite: z
		.object({
			packageName: z.string().min(1),
			nodeType: z.string().min(1),
			credentialTypes: z.array(z.string().min(1)).min(1),
		})
		.nullish()
		.transform((value) => value ?? undefined),
});

export const mcpRegistryServerSchema = mcpRegistryServerBaseSchema;

export type McpRegistryServer = z.output<typeof mcpRegistryServerSchema>;
export type McpRegistryIcon = McpRegistryServer['icons'][number];
export type McpRegistryRemote = McpRegistryServer['remotes'][number];
export type McpRegistryRemoteType = McpRegistryRemote['type'];
export type McpRegistryTool = McpRegistryServer['tools'][number];
export type McpRegistryToolAnnotations = NonNullable<McpRegistryTool['annotations']>;

export function parseMcpRegistryServer(value: unknown): McpRegistryServer | null {
	const result = mcpRegistryServerSchema.safeParse(value);
	return result.success ? result.data : null;
}

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
