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

const oauth2Document = {
	kind: 'oauth2',
	fetchedAt: '2026-09-30T10:00:00.000Z',
	discovery: {
		issuer,
		jwks_uri: `${issuer}/keys`,
		authorization_endpoint: `${issuer}/authorize`,
		token_endpoint: `${issuer}/token`,
	},
	jwks: { keys: [{ kid: 'k1', kty: 'RSA', use: 'sig', alg: 'RS256', n: 'AQAB', e: 'AQAB' }] },
};

describe('TrustedSourceMetadataSchema', () => {
	it('accepts a v1 document list with an oauth2 discovery document', () => {
		const parsed = TrustedSourceMetadataSchema.parse({ version: 1, documents: [oauth2Document] });

		expect(parsed).toMatchObject({
			version: 1,
			documents: [{ kind: 'oauth2', discovery: { issuer } }],
		});
	});

	it('keeps discovery and JWK fields it does not type, so a later reader finds them', () => {
		const parsed = TrustedSourceMetadataSchema.parse({
			version: 1,
			documents: [
				{
					...oauth2Document,
					discovery: {
						...oauth2Document.discovery,
						introspection_endpoint: `${issuer}/introspect`,
					},
				},
			],
		});

		expect(parsed.documents[0]).toMatchObject({
			discovery: { introspection_endpoint: `${issuer}/introspect` },
			jwks: { keys: [{ n: 'AQAB', e: 'AQAB' }] },
		});
	});

	it('accepts an empty document list, the state before discovery has run', () => {
		expect(TrustedSourceMetadataSchema.parse({ version: 1, documents: [] })).toEqual({
			version: 1,
			documents: [],
		});
	});

	it.each([
		['an unknown document kind', { version: 1, documents: [{ ...oauth2Document, kind: 'saml' }] }],
		['an unknown version', { version: 2, documents: [] }],
		[
			'a non-https jwks_uri',
			{
				version: 1,
				documents: [
					{
						...oauth2Document,
						discovery: { ...oauth2Document.discovery, jwks_uri: 'http://idp.example/keys' },
					},
				],
			},
		],
		[
			'a key without kty',
			{ version: 1, documents: [{ ...oauth2Document, jwks: { keys: [{ kid: 'k1' }] } }] },
		],
	])('rejects %s', (_label, document) => {
		expect(TrustedSourceMetadataSchema.safeParse(document).success).toBe(false);
	});
});

describe('deriveCapabilities', () => {
	type AuthOverrides = Record<string, unknown>;

	const config = (
		authentication: AuthOverrides,
		managedBy: ManagedBy = 'admin',
	): TrustedSourceConfigLatest =>
		migrateToLatest(
			trustedSourceConfigSchemaFor(managedBy).parse({
				version: 1,
				authentication: { type: 'oauth2', ...authentication },
				surfaces: { 'public-api': {} },
			}),
		);

	const metadata = (discovery?: Record<string, unknown>, withJwks = true): TrustedSourceMetadata =>
		TrustedSourceMetadataSchema.parse({
			version: 1,
			documents: [
				{
					kind: 'oauth2',
					fetchedAt: oauth2Document.fetchedAt,
					...(discovery ? { discovery: { issuer, ...discovery } } : {}),
					...(withJwks ? { jwks: oauth2Document.jwks } : {}),
				},
			],
		});

	const registeredClient = { kind: 'registered', clientId: 'n8n' };
	const endpoints = {
		authorization_endpoint: `${issuer}/authorize`,
		token_endpoint: `${issuer}/token`,
	};

	const cases: Array<
		[string, TrustedSourceConfigLatest, () => TrustedSourceMetadata | null, Capability[]]
	> = [
		['jwks-uri keys and no metadata grant nothing', config({}), () => null, []],
		[
			'a discovered jwks_uri grants verify-jwt',
			config({}),
			() => metadata({ jwks_uri: `${issuer}/keys` }),
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
			() => metadata(endpoints),
			[],
		],
		[
			'discovered endpoints with a client grant redirect-login',
			config({ client: registeredClient }),
			() => metadata({ ...endpoints, jwks_uri: `${issuer}/keys` }),
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
			() => metadata({ authorization_endpoint: `${issuer}/authorize` }),
			[],
		],
		[
			'a jwks document without a jwks_uri grants nothing on its own',
			config({}),
			() => metadata(undefined, true),
			[],
		],
	];

	it.each(cases)('%s', (_label, cfg, meta, expected) => {
		expect([...deriveCapabilities(cfg, meta())].sort()).toEqual([...expected].sort());
	});
});
