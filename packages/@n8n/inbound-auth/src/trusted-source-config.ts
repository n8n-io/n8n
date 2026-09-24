import { GLOBAL_OWNER_ROLE_SLUG } from '@n8n/permissions';
import { z } from 'zod';

/**
 * Asymmetric-only JWT algorithms accepted for trusted sources.
 * Symmetric (HMAC) and 'none' are excluded by design.
 */
export const JwtAlgorithmSchema = z.enum([
	'RS256',
	'RS384',
	'RS512',
	'ES256',
	'ES384',
	'ES512',
	'PS256',
	'PS384',
	'PS512',
	'EdDSA',
]);
export type JwtAlgorithm = z.infer<typeof JwtAlgorithmSchema>;

/** A single rule mapping claims to an instance or project role. Bounds match the public API DTO. */
export const RoleMappingRuleSchema = z.object({
	id: z.string().min(1),
	expression: z.string().min(1),
	role: z.string().min(1).max(128),
	/** undefined = instance role rule; set = project role rule */
	projectId: z.string().min(1).optional(),
	enabled: z.boolean(),
	description: z.string().optional(),
});
export type RoleMappingRule = z.infer<typeof RoleMappingRuleSchema>;

export const SurfaceIdSchema = z.enum(['public-api', 'instance-mcp', 'trigger']);
export type SurfaceId = z.infer<typeof SurfaceIdSchema>;

export const ManagedBySchema = z.enum(['system', 'admin']);
export type ManagedBy = z.infer<typeof ManagedBySchema>;

// An admin-supplied endpoint is fetched server-side, so it must be https.
const HttpsUrl = z
	.string()
	.url()
	.refine((url) => url.startsWith('https://'), { message: 'must be an https URL' });

export const Oauth2AuthenticationSchema = z.object({
	type: z.literal('oauth2'),
	discovery: z
		.discriminatedUnion('mode', [
			z.object({ mode: z.literal('auto') }),
			z.object({
				mode: z.literal('manual'),
				metadataUrl: HttpsUrl.optional(),
				jwksUri: HttpsUrl.optional(),
				authorizationEndpoint: HttpsUrl.optional(),
				tokenEndpoint: HttpsUrl.optional(),
			}),
		])
		.default({ mode: 'auto' }),
	keys: z
		.discriminatedUnion('kind', [
			z.object({ kind: z.literal('jwks-uri') }),
			z.object({ kind: z.literal('local-keystore') }),
		])
		.default({ kind: 'jwks-uri' }),
	// A union with one member, so introspection can be added later without a version bump.
	verification: z
		.discriminatedUnion('mode', [z.object({ mode: z.literal('jwt') })])
		.default({ mode: 'jwt' }),
	algorithms: z
		.array(JwtAlgorithmSchema)
		.min(1)
		.default([...JwtAlgorithmSchema.options]),
	// Upper bounds keep both windows from disabling `exp`/`nbf` checks. Relaxing later is additive.
	maxTokenLifetimeSeconds: z.number().int().positive().max(86400).default(86400),
	clockSkewSeconds: z.number().int().nonnegative().max(300).default(60),
	// The client secret is not part of the document: see `TrustedSourceSecretsSchema`.
	client: z
		.discriminatedUnion('kind', [
			z.object({
				kind: z.literal('registered'),
				clientId: z.string().min(1),
				scopes: z.array(z.string()).optional(),
			}),
			z.object({ kind: z.literal('virtual') }),
		])
		.optional(),
});
export type Oauth2Authentication = z.infer<typeof Oauth2AuthenticationSchema>;

/** Discriminated on `type`. A new authentication method is a new member here, not a new config version. */
export const AuthenticationSchema = z.discriminatedUnion('type', [Oauth2AuthenticationSchema]);
export type TrustedSourceAuthentication = z.infer<typeof AuthenticationSchema>;

/**
 * `audiences` absent means the surface's canonical audience is required. It never means the `aud`
 * check is skipped, and an empty list is refused so it cannot be read that way either.
 */
export const SurfaceSettingsSchema = z.object({
	audiences: z.array(z.string().min(1)).min(1).optional(),
});
/** A key present means the source is accepted on that surface. Unregistered keys are rejected by zod. */
export const SurfacesSchema = z.record(SurfaceIdSchema, SurfaceSettingsSchema);
export type TrustedSourceSurfaces = z.infer<typeof SurfacesSchema>;

/**
 * A claim name, or an n8n expression over `$claims` when prefixed with `=`, the same convention
 * node parameters use. `={{ $claims.email ?? $claims.upn }}` covers IdPs whose claims differ.
 */
const claimSource = z.string().min(1);
/** The binding key stays a plain claim name, so re-keying a source is a one-token, auditable change. */
const claimName = claimSource.refine((value) => !value.startsWith('='), {
	message: 'subject must be a claim name, not an expression',
});

export const ClaimMappingSchema = z.object({
	subject: claimName.default('sub'),
	email: claimSource.default('email'),
	emailVerified: claimSource.default('email_verified'),
	displayName: claimSource.default('name'),
	clientId: claimSource.default('client_id'),
	scopes: claimSource.default('scope'),
});
export type ClaimMapping = z.infer<typeof ClaimMappingSchema>;

export const RoleMappingSchema = z.object({
	mode: z.enum(['off', 'on-provision', 'continuous']).default('off'),
	instanceRoleRules: z.array(RoleMappingRuleSchema).default([]),
	projectRoleRules: z.array(RoleMappingRuleSchema).default([]),
	fallbackInstanceRole: z.string().min(1).optional(),
});
export type RoleMapping = z.infer<typeof RoleMappingSchema>;

export const IdentitySchema = z.object({
	subject: z.enum(['n8n-user-id', 'binding']).default('binding'),
	claimMapping: ClaimMappingSchema.default({}),
	linkByEmail: z.enum(['off', 'verified-only', 'any']).default('verified-only'),
	provision: z.object({ human: z.enum(['off', 'jit']).default('off') }).default({}),
	roleMapping: RoleMappingSchema.default({}),
});
export type TrustedSourceIdentity = z.infer<typeof IdentitySchema>;

export const TrustedSourceConfigV1Schema = z.object({
	version: z.literal(1),
	// No default: the authentication method is an explicit choice.
	authentication: AuthenticationSchema,
	surfaces: SurfacesSchema,
	identity: IdentitySchema.default({}),
});
export type TrustedSourceConfigV1 = z.infer<typeof TrustedSourceConfigV1Schema>;
export type TrustedSourceConfigV1Input = z.input<typeof TrustedSourceConfigV1Schema>;

const ownerRoleIssue = (path: Array<string | number>): z.IssueData => ({
	code: z.ZodIssueCode.custom,
	message: 'provisioning never assigns the instance owner role',
	path,
});

/**
 * The config document of one trusted source. Unknown keys are stripped, not rejected: an added
 * optional field keeps the version, so an older process in a rolling deploy must tolerate it. The
 * write path (admin DTO) must therefore reject unknown keys itself, and the store must persist the
 * parsed output, not the raw input, so a later default change does not alter stored rows.
 *
 * Cross-field rules live here on the union, not on the block schemas: a discriminated-union member
 * has to stay a plain object, and the rules hold for every version anyway.
 */
export const TrustedSourceConfigSchema = z
	.discriminatedUnion('version', [TrustedSourceConfigV1Schema])
	.superRefine((config, ctx) => {
		const { authentication, identity } = config;
		if (
			authentication.discovery.mode === 'manual' &&
			authentication.keys.kind === 'jwks-uri' &&
			!authentication.discovery.jwksUri &&
			!authentication.discovery.metadataUrl
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'manual discovery with jwks-uri keys requires jwksUri or metadataUrl',
				path: ['authentication', 'discovery'],
			});
		}
		if (identity.provision.human === 'jit' && identity.roleMapping.mode === 'off') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'jit provisioning requires a role-mapping mode',
				path: ['identity', 'roleMapping', 'mode'],
			});
		}
		if (identity.roleMapping.mode !== 'off' && !identity.roleMapping.fallbackInstanceRole) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: 'a role-mapping mode requires a fallback role',
				path: ['identity', 'roleMapping', 'fallbackInstanceRole'],
			});
		}
		if (identity.roleMapping.fallbackInstanceRole === GLOBAL_OWNER_ROLE_SLUG) {
			ctx.addIssue(ownerRoleIssue(['identity', 'roleMapping', 'fallbackInstanceRole']));
		}
		identity.roleMapping.instanceRoleRules.forEach((rule, index) => {
			const path = ['identity', 'roleMapping', 'instanceRoleRules', index];
			if (rule.role === GLOBAL_OWNER_ROLE_SLUG) ctx.addIssue(ownerRoleIssue([...path, 'role']));
			if (rule.projectId !== undefined) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'an instance role rule must not set projectId',
					path: [...path, 'projectId'],
				});
			}
		});
		identity.roleMapping.projectRoleRules.forEach((rule, index) => {
			if (rule.projectId === undefined) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'a project role rule requires projectId',
					path: ['identity', 'roleMapping', 'projectRoleRules', index, 'projectId'],
				});
			}
		});
	});
export type TrustedSourceConfig = z.infer<typeof TrustedSourceConfigSchema>;

/**
 * The config schema for one row. `managedBy` is a column, not part of the document, so the rules
 * that depend on it are added per row on top of the shared schema.
 */
export const trustedSourceConfigSchemaFor = (managedBy: ManagedBy) =>
	TrustedSourceConfigSchema.superRefine((config, ctx) => {
		if (managedBy === 'system') return;
		if (config.identity.subject === 'n8n-user-id') {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "identity.subject 'n8n-user-id' is only allowed on system-managed sources",
				path: ['identity', 'subject'],
			});
		}
		// Narrow on the method first: these two rules are oauth2-specific.
		if (config.authentication.type === 'oauth2') {
			if (config.authentication.keys.kind === 'local-keystore') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message:
						"authentication.keys.kind 'local-keystore' is only allowed on system-managed sources",
					path: ['authentication', 'keys', 'kind'],
				});
			}
			if (config.authentication.client?.kind === 'virtual') {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "authentication.client.kind 'virtual' is only allowed on system-managed sources",
					path: ['authentication', 'client', 'kind'],
				});
			}
		}
	});

/**
 * Secret material of a trusted source. Stored apart from the config document in its own encrypted
 * column, so the document stays safe to return to an admin UI unchanged. Strict: a secret payload
 * with an unknown key is a bug, not a forward-compatible read.
 */
export const TrustedSourceSecretsSchema = z
	.object({
		version: z.literal(1),
		clientSecret: z.string().min(1).optional(),
	})
	.strict();
export type TrustedSourceSecrets = z.infer<typeof TrustedSourceSecretsSchema>;

type ConfigMigration = (config: TrustedSourceConfig) => TrustedSourceConfig;

/** One step per version, keyed by the version it migrates from. Empty until a v2 exists. */
export const configMigrations: Record<number, ConfigMigration> = {};

const LATEST_VERSION = 1;

export type TrustedSourceConfigLatest = Extract<
	TrustedSourceConfig,
	{ version: typeof LATEST_VERSION }
>;

const isLatest = (config: TrustedSourceConfig): config is TrustedSourceConfigLatest =>
	config.version === LATEST_VERSION;

export function migrateToLatest(config: TrustedSourceConfig): TrustedSourceConfigLatest {
	let current: TrustedSourceConfig = config;
	// A plain number, not `current.version`: comparing the discriminant would narrow `current` to
	// `never` while the union has one member.
	let version: number = current.version;
	while (version !== LATEST_VERSION) {
		const migrate: ConfigMigration | undefined = configMigrations[version];
		if (!migrate) {
			throw new Error(`No migration from trusted source config version ${version}`);
		}
		current = migrate(current);
		// A step must advance the version, or the chain would never end.
		if (current.version <= version) {
			throw new Error(
				`Migration from trusted source config version ${version} did not advance the version`,
			);
		}
		version = current.version;
	}
	if (!isLatest(current)) {
		throw new Error('Migration chain did not reach the latest trusted source config version');
	}
	return current;
}
