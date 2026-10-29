import { z } from 'zod';

import type {
	ManagedBy,
	TrustedSourceAuthentication,
	TrustedSourceConfigLatest,
} from './trusted-source-config';

export type TrustedSourceStatus = 'unchecked' | 'healthy' | 'error';

/** Only the fields the pipeline reads are typed; the rest passes through for later readers. */
export const JwkSchema = z
	.object({
		kid: z.string().optional(),
		kty: z.string().min(1),
		use: z.string().optional(),
		alg: z.string().optional(),
	})
	.passthrough();
export type Jwk = z.infer<typeof JwkSchema>;

/**
 * RFC 8414 fields. OpenID Connect Discovery documents carry the same core fields plus OIDC ones,
 * so one schema reads both. Only what the pipeline reads is typed; the rest passes through.
 * URLs are not restricted to https here: the local server's documents carry `http://localhost`
 * URLs in dev and behind TLS termination. The client enforces https at fetch time.
 */
export const AuthorizationServerMetadataSchema = z
	.object({
		issuer: z.string().min(1),
		jwks_uri: z.string().url().optional(),
		authorization_endpoint: z.string().url().optional(),
		token_endpoint: z.string().url().optional(),
	})
	.passthrough();
export type AuthorizationServerMetadata = z.infer<typeof AuthorizationServerMetadataSchema>;

const fetchedAt = z.string().datetime();

/**
 * One document per protocol artifact, discriminated on `kind`. OpenID Connect Discovery and
 * RFC 8414 metadata are two documents at two URLs; an issuer may serve either or both. The JWKS
 * is its own document because it comes from one URL with its own lifetime. A future SAML metadata
 * document is a new member here, not a new column.
 */
export const DiscoveryDocumentSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('openid-configuration'),
		fetchedAt,
		document: AuthorizationServerMetadataSchema,
	}),
	z.object({
		kind: z.literal('oauth2-authorization-server'),
		fetchedAt,
		document: AuthorizationServerMetadataSchema,
	}),
	z.object({ kind: z.literal('jwks'), fetchedAt, url: z.string().url(), keys: z.array(JwkSchema) }),
]);
export type DiscoveryDocument = z.infer<typeof DiscoveryDocumentSchema>;

export const TrustedSourceMetadataSchema = z.object({
	version: z.literal(1),
	// One document per kind: readers take the first match, so a duplicate could shadow it.
	documents: z
		.array(DiscoveryDocumentSchema)
		.refine(
			(documents) => new Set(documents.map((document) => document.kind)).size === documents.length,
			{ message: 'one document per kind' },
		),
});
export type TrustedSourceMetadata = z.infer<typeof TrustedSourceMetadataSchema>;

/**
 * A trusted source as consumers see it: decrypted, validated and migrated to the latest config
 * version. Dates are ISO strings so the shape survives a Redis round-trip unchanged.
 */
export type TrustedSource = {
	id: string;
	name: string;
	type: TrustedSourceAuthentication['type'];
	issuer: string;
	managedBy: ManagedBy;
	status: TrustedSourceStatus;
	lastError: string | null;
	lastCheckedAt: string | null;
	createdAt: string;
	updatedAt: string;
	config: TrustedSourceConfigLatest;
	/** `null` until discovery has run. */
	metadata: TrustedSourceMetadata | null;
};

export type Capability = 'verify-jwt' | 'redirect-login';

/** The OAuth2 endpoints a source resolves to, field by field: manual config, then OIDC, then RFC 8414. */
export type OAuth2Endpoints = {
	jwksUri?: string;
	authorizationEndpoint?: string;
	tokenEndpoint?: string;
};

export function resolveOAuth2Endpoints(
	config: TrustedSourceConfigLatest,
	documents: DiscoveryDocument[],
): OAuth2Endpoints {
	const { authentication } = config;
	if (authentication.type !== 'oauth2') return {};

	const manual = authentication.discovery.mode === 'manual' ? authentication.discovery : undefined;
	const metadataOf = (kind: 'openid-configuration' | 'oauth2-authorization-server') =>
		documents.find(
			(document): document is Extract<DiscoveryDocument, { kind: typeof kind }> =>
				document.kind === kind,
		)?.document;
	const oidc = metadataOf('openid-configuration');
	const oauth2 = metadataOf('oauth2-authorization-server');

	return {
		jwksUri: manual?.jwksUri ?? oidc?.jwks_uri ?? oauth2?.jwks_uri,
		authorizationEndpoint:
			manual?.authorizationEndpoint ??
			oidc?.authorization_endpoint ??
			oauth2?.authorization_endpoint,
		tokenEndpoint: manual?.tokenEndpoint ?? oidc?.token_endpoint ?? oauth2?.token_endpoint,
	};
}

/** Pure: capabilities come from the config and the discovered metadata, never from the network. */
export function deriveCapabilities(
	config: TrustedSourceConfigLatest,
	metadata: TrustedSourceMetadata | null,
): ReadonlySet<Capability> {
	const capabilities = new Set<Capability>();
	const { authentication } = config;
	if (authentication.type !== 'oauth2') return capabilities;

	const { jwksUri, authorizationEndpoint, tokenEndpoint } = resolveOAuth2Endpoints(
		config,
		metadata?.documents ?? [],
	);
	// A local keystore is discovered like any other source, so it also needs a jwks_uri.
	if (jwksUri) capabilities.add('verify-jwt');
	if (authentication.client && authorizationEndpoint && tokenEndpoint) {
		capabilities.add('redirect-login');
	}
	return capabilities;
}
