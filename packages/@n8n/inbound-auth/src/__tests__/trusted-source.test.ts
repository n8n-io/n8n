import {
	deriveCapabilities,
	TrustedSourceMetadataSchema,
	type Capability,
	type TrustedSourceMetadata,
} from '../trusted-source';
import {
	migrateToLatest,
	trustedSourceConfigSchemaFor,
	type ManagedBy,
	type TrustedSourceConfigLatest,
} from '../trusted-source-config';

const issuer = 'https://idp.example';
const fetchedAt = '2026-09-30T10:00:00.000Z';

const endpoints = {
	authorization_endpoint: `${issuer}/authorize`,
	token_endpoint: `${issuer}/token`,
};
const fullMetadata = { issuer, jwks_uri: `${issuer}/keys`, ...endpoints };

const oidcDocument = { kind: 'openid-configuration', fetchedAt, document: fullMetadata };
const oauth2Document = { kind: 'oauth2-authorization-server', fetchedAt, document: fullMetadata };
const jwksDocument = {
	kind: 'jwks',
	fetchedAt,
	url: `${issuer}/keys`,
	keys: [{ kid: 'k1', kty: 'RSA', use: 'sig', alg: 'RS256', n: 'AQAB', e: 'AQAB' }],
};

describe('TrustedSourceMetadataSchema', () => {
	it('accepts a v1 list with an OIDC document, an RFC 8414 document and a JWKS', () => {
		const parsed = TrustedSourceMetadataSchema.parse({
			version: 1,
			documents: [oidcDocument, oauth2Document, jwksDocument],
		});

		expect(parsed.documents.map((document) => document.kind)).toEqual([
			'openid-configuration',
			'oauth2-authorization-server',
			'jwks',
		]);
	});

	it('keeps metadata and JWK fields it does not type, so a later reader finds them', () => {
		const parsed = TrustedSourceMetadataSchema.parse({
			version: 1,
			documents: [
				{
					...oidcDocument,
					document: { ...fullMetadata, userinfo_endpoint: `${issuer}/userinfo` },
				},
				jwksDocument,
			],
		});

		expect(parsed.documents[0]).toMatchObject({
			document: { userinfo_endpoint: `${issuer}/userinfo` },
		});
		expect(parsed.documents[1]).toMatchObject({ keys: [{ n: 'AQAB', e: 'AQAB' }] });
	});

	it('accepts an empty document list, the state before discovery has run', () => {
		expect(TrustedSourceMetadataSchema.parse({ version: 1, documents: [] })).toEqual({
			version: 1,
			documents: [],
		});
	});

	it.each([
		['an unknown document kind', [{ ...oidcDocument, kind: 'saml' }]],
		[
			'a non-https jwks_uri in a metadata document',
			[{ ...oidcDocument, document: { ...fullMetadata, jwks_uri: 'http://idp.example/keys' } }],
		],
		['a non-https JWKS url', [{ ...jwksDocument, url: 'http://idp.example/keys' }]],
		['a key without kty', [{ ...jwksDocument, keys: [{ kid: 'k1' }] }]],
		['two documents of the same kind', [oidcDocument, oidcDocument]],
	])('rejects %s', (_label, documents) => {
		expect(TrustedSourceMetadataSchema.safeParse({ version: 1, documents }).success).toBe(false);
	});

	it('rejects an unknown version', () => {
		expect(TrustedSourceMetadataSchema.safeParse({ version: 2, documents: [] }).success).toBe(
			false,
		);
	});
});

describe('deriveCapabilities', () => {
	const config = (
		authentication: Record<string, unknown>,
		managedBy: ManagedBy = 'admin',
	): TrustedSourceConfigLatest =>
		migrateToLatest(
			trustedSourceConfigSchemaFor(managedBy).parse({
				version: 1,
				authentication: { type: 'oauth2', ...authentication },
				surfaces: { 'public-api': {} },
			}),
		);

	type Fields = Partial<Omit<typeof fullMetadata, 'issuer'>>;
	const metadata = (documents: {
		oidc?: Fields;
		oauth2?: Fields;
		jwks?: boolean;
	}): TrustedSourceMetadata =>
		TrustedSourceMetadataSchema.parse({
			version: 1,
			documents: [
				...(documents.oidc ? [{ ...oidcDocument, document: { issuer, ...documents.oidc } }] : []),
				...(documents.oauth2
					? [{ ...oauth2Document, document: { issuer, ...documents.oauth2 } }]
					: []),
				...(documents.jwks ? [jwksDocument] : []),
			],
		});

	const registeredClient = { kind: 'registered', clientId: 'n8n' };
	// Manual discovery with jwks-uri keys needs a jwksUri or metadataUrl to pass the config schema.
	const manualAuthorizationEndpoint = {
		mode: 'manual',
		authorizationEndpoint: `${issuer}/authorize`,
		metadataUrl: `${issuer}/.well-known/openid-configuration`,
	};

	const cases: Array<
		[string, TrustedSourceConfigLatest, () => TrustedSourceMetadata | null, Capability[]]
	> = [
		['jwks-uri keys and no metadata grant nothing', config({}), () => null, []],
		[
			'a jwks_uri in the OIDC document grants verify-jwt',
			config({}),
			() => metadata({ oidc: { jwks_uri: `${issuer}/keys` } }),
			['verify-jwt'],
		],
		[
			'a jwks_uri in the RFC 8414 document grants verify-jwt',
			config({}),
			() => metadata({ oauth2: { jwks_uri: `${issuer}/keys` } }),
			['verify-jwt'],
		],
		[
			'a manual jwksUri grants verify-jwt without metadata',
			config({ discovery: { mode: 'manual', jwksUri: `${issuer}/keys` } }),
			() => null,
			['verify-jwt'],
		],
		[
			'local-keystore grants verify-jwt without metadata',
			config({ keys: { kind: 'local-keystore' } }, 'system'),
			() => null,
			['verify-jwt'],
		],
		[
			'discovered endpoints without a client grant no redirect-login',
			config({}),
			() => metadata({ oidc: endpoints }),
			[],
		],
		[
			'discovered endpoints with a client grant redirect-login',
			config({ client: registeredClient }),
			() => metadata({ oidc: fullMetadata }),
			['verify-jwt', 'redirect-login'],
		],
		[
			'manual endpoints with a client grant redirect-login without metadata',
			config({
				client: registeredClient,
				discovery: {
					mode: 'manual',
					authorizationEndpoint: `${issuer}/authorize`,
					tokenEndpoint: `${issuer}/token`,
					jwksUri: `${issuer}/keys`,
				},
			}),
			() => null,
			['verify-jwt', 'redirect-login'],
		],
		[
			'only an authorization endpoint with a client grants no redirect-login',
			config({ client: registeredClient }),
			() => metadata({ oidc: { authorization_endpoint: `${issuer}/authorize` } }),
			[],
		],
		[
			'a JWKS document without any jwks_uri grants nothing on its own',
			config({}),
			() => metadata({ jwks: true }),
			[],
		],
		// Fields merge: manual config, then the OIDC document, then the RFC 8414 document.
		[
			'a manual authorization endpoint completes discovered token and jwks endpoints',
			config({ client: registeredClient, discovery: manualAuthorizationEndpoint }),
			() => metadata({ oidc: { token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/keys` } }),
			['verify-jwt', 'redirect-login'],
		],
		[
			'a manual authorization endpoint with only a discovered token endpoint grants redirect-login alone',
			config({ client: registeredClient, discovery: manualAuthorizationEndpoint }),
			() => metadata({ oidc: { token_endpoint: `${issuer}/token` } }),
			['redirect-login'],
		],
		[
			'an authorization endpoint from OIDC and a token endpoint from RFC 8414 combine',
			config({ client: registeredClient }),
			() =>
				metadata({
					oidc: { authorization_endpoint: `${issuer}/authorize` },
					oauth2: { token_endpoint: `${issuer}/token` },
				}),
			['redirect-login'],
		],
		[
			'a manual jwksUri wins over a discovered one while the endpoints come from discovery',
			config({
				client: registeredClient,
				discovery: { mode: 'manual', jwksUri: `${issuer}/manual-keys` },
			}),
			() => metadata({ oauth2: { ...endpoints, jwks_uri: 'https://elsewhere.example/keys' } }),
			['verify-jwt', 'redirect-login'],
		],
	];

	it.each(cases)('%s', (_label, cfg, meta, expected) => {
		expect([...deriveCapabilities(cfg, meta())].sort()).toEqual([...expected].sort());
	});
});
