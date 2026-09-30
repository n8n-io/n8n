import { z } from 'zod';

import type {
	ManagedBy,
	TrustedSourceAuthentication,
	TrustedSourceConfigLatest,
} from './trusted-source-config';

export type TrustedSourceStatus = 'unchecked' | 'healthy' | 'error';

// An admin-supplied endpoint is fetched server-side, so it must be https.
const HttpsUrl = z
	.string()
	.url()
	.refine((url) => url.startsWith('https://'), { message: 'must be an https URL' });

/** Only the fields the pipeline reads are typed; the rest passes through for later readers. */
const JwkSchema = z
	.object({
		kid: z.string().optional(),
		kty: z.string().min(1),
		use: z.string().optional(),
		alg: z.string().optional(),
	})
	.passthrough();

const Oauth2DiscoverySchema = z
	.object({
		issuer: z.string().min(1),
		jwks_uri: HttpsUrl.optional(),
		authorization_endpoint: HttpsUrl.optional(),
		token_endpoint: HttpsUrl.optional(),
	})
	.passthrough();

/**
 * One discovered document per protocol, discriminated on `kind`. A future SAML metadata document
 * is a new member here, not a new column.
 */
export const DiscoveryDocumentSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('oauth2'),
		fetchedAt: z.string().datetime(),
		discovery: Oauth2DiscoverySchema.optional(),
		jwks: z.object({ keys: z.array(JwkSchema) }).optional(),
	}),
]);
export type DiscoveryDocument = z.infer<typeof DiscoveryDocumentSchema>;

export const TrustedSourceMetadataSchema = z.object({
	version: z.literal(1),
	// One document per protocol: readers take the first match, so a duplicate could shadow it.
	documents: z
		.array(DiscoveryDocumentSchema)
		.refine(
			(documents) => new Set(documents.map((document) => document.kind)).size === documents.length,
			{
				message: 'one document per kind',
			},
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

/** Pure: capabilities come from the config and the discovered metadata, never from the network. */
export function deriveCapabilities(
	config: TrustedSourceConfigLatest,
	metadata: TrustedSourceMetadata | null,
): ReadonlySet<Capability> {
	const capabilities = new Set<Capability>();
	const { authentication } = config;
	if (authentication.type !== 'oauth2') return capabilities;

	const discovered = metadata?.documents.find((document) => document.kind === 'oauth2')?.discovery;
	const manual = authentication.discovery.mode === 'manual' ? authentication.discovery : undefined;

	// Manual endpoints win over discovered ones, field by field.
	const jwksUri = manual?.jwksUri ?? discovered?.jwks_uri;
	const authorizationEndpoint = manual?.authorizationEndpoint ?? discovered?.authorization_endpoint;
	const tokenEndpoint = manual?.tokenEndpoint ?? discovered?.token_endpoint;

	if (authentication.keys.kind === 'local-keystore' || jwksUri) capabilities.add('verify-jwt');
	if (authentication.client && authorizationEndpoint && tokenEndpoint) {
		capabilities.add('redirect-login');
	}
	return capabilities;
}
