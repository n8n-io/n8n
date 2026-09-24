import {
	configMigrations,
	migrateToLatest,
	TrustedSourceConfigSchema,
	trustedSourceConfigSchemaFor,
	TrustedSourceSecretsSchema,
	type TrustedSourceConfig,
} from '../trusted-source-config';
import { trustedSourceConfigV1Fixture } from './fixtures/trusted-source-config.v1';

const minimalDocument = {
	version: 1,
	authentication: { type: 'oauth2' },
	surfaces: {},
};

const fullyDefaultedDocument = {
	version: 1,
	authentication: {
		type: 'oauth2',
		discovery: { mode: 'auto' },
		keys: { kind: 'jwks-uri' },
		verification: { mode: 'jwt' },
		algorithms: [
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
		],
		maxTokenLifetimeSeconds: 86400,
		clockSkewSeconds: 60,
	},
	surfaces: {},
	identity: {
		subject: 'binding',
		claimMapping: {
			subject: 'sub',
			email: 'email',
			emailVerified: 'email_verified',
			displayName: 'name',
			clientId: 'client_id',
			scopes: 'scope',
		},
		linkByEmail: 'verified-only',
		provision: { human: 'off' },
		roleMapping: { mode: 'off', instanceRoleRules: [], projectRoleRules: [] },
	},
};

const rule = { id: 'r1', expression: '={{ true }}', role: 'global:member', enabled: true };

const withIdentity = (identity: Record<string, unknown>) => ({
	...fullyDefaultedDocument,
	identity: { ...fullyDefaultedDocument.identity, ...identity },
});
const withAuthentication = (authentication: Record<string, unknown>) => ({
	...fullyDefaultedDocument,
	authentication: { ...fullyDefaultedDocument.authentication, ...authentication },
});
const withRoleMapping = (roleMapping: Record<string, unknown>) =>
	withIdentity({ roleMapping: { ...fullyDefaultedDocument.identity.roleMapping, ...roleMapping } });

const issuesOf = (result: ReturnType<typeof TrustedSourceConfigSchema.safeParse>) =>
	result.success ? [] : result.error.issues;

describe('TrustedSourceConfigSchema defaults', () => {
	test('a minimal document with only version, authentication type and surfaces gets every default applied', () => {
		expect(TrustedSourceConfigSchema.parse(minimalDocument)).toEqual(fullyDefaultedDocument);
	});
});

describe('TrustedSourceConfigSchema shape', () => {
	test.each([
		{ name: 'an unknown version', document: { ...minimalDocument, version: 2 }, path: ['version'] },
		{
			name: 'a missing authentication block',
			document: { version: 1, surfaces: {} },
			path: ['authentication'],
		},
		{
			name: 'an unknown authentication type',
			document: { ...minimalDocument, authentication: { type: 'saml' } },
			path: ['authentication', 'type'],
		},
		{
			name: 'a surface key that is not a registered surface id',
			document: { ...fullyDefaultedDocument, surfaces: { 'not-a-real-surface': {} } },
			path: ['surfaces', 'not-a-real-surface'],
		},
		{
			name: 'an empty audiences list',
			document: { ...fullyDefaultedDocument, surfaces: { 'public-api': { audiences: [] } } },
			path: ['surfaces', 'public-api', 'audiences'],
		},
		{
			name: 'a registered client without clientId',
			document: withAuthentication({ client: { kind: 'registered', clientId: '' } }),
			path: ['authentication', 'client', 'clientId'],
		},
		{
			name: 'an empty algorithms list',
			document: withAuthentication({ algorithms: [] }),
			path: ['authentication', 'algorithms'],
		},
		{
			name: 'a token lifetime above one day',
			document: withAuthentication({ maxTokenLifetimeSeconds: 86401 }),
			path: ['authentication', 'maxTokenLifetimeSeconds'],
		},
		{
			name: 'a clock skew above five minutes',
			document: withAuthentication({ clockSkewSeconds: 301 }),
			path: ['authentication', 'clockSkewSeconds'],
		},
	])('rejects $name', ({ document, path }) => {
		const result = TrustedSourceConfigSchema.safeParse(document);

		expect(result.success).toBe(false);
		expect(issuesOf(result)).toContainEqual(expect.objectContaining({ path }));
	});

	test('a registered client carries no secret in the document', () => {
		const document = withAuthentication({
			client: { kind: 'registered', clientId: 'n8n', clientSecret: 'leaked' },
		});

		const parsed = TrustedSourceConfigSchema.parse(document);

		expect(parsed.authentication.client).toEqual({ kind: 'registered', clientId: 'n8n' });
	});
});

describe('TrustedSourceConfigSchema refinement rules', () => {
	test.each([
		{
			rule: 'jit provisioning requires a role-mapping mode',
			document: withIdentity({ provision: { human: 'jit' } }),
			path: ['identity', 'roleMapping', 'mode'],
		},
		{
			rule: 'a role-mapping mode requires a fallback role',
			document: withRoleMapping({ mode: 'on-provision' }),
			path: ['identity', 'roleMapping', 'fallbackInstanceRole'],
		},
		{
			rule: 'manual discovery with jwks-uri keys requires jwksUri or metadataUrl',
			document: withAuthentication({ discovery: { mode: 'manual' } }),
			path: ['authentication', 'discovery'],
		},
		{
			rule: 'provisioning never assigns the instance owner role',
			document: withRoleMapping({ mode: 'on-provision', fallbackInstanceRole: 'global:owner' }),
			path: ['identity', 'roleMapping', 'fallbackInstanceRole'],
		},
		{
			rule: 'provisioning never assigns the instance owner role',
			document: withRoleMapping({ instanceRoleRules: [{ ...rule, role: 'global:owner' }] }),
			path: ['identity', 'roleMapping', 'instanceRoleRules', 0, 'role'],
		},
		{
			rule: 'an instance role rule must not set projectId',
			document: withRoleMapping({ instanceRoleRules: [{ ...rule, projectId: 'p1' }] }),
			path: ['identity', 'roleMapping', 'instanceRoleRules', 0, 'projectId'],
		},
		{
			rule: 'a project role rule requires projectId',
			document: withRoleMapping({ projectRoleRules: [{ ...rule, role: 'project:editor' }] }),
			path: ['identity', 'roleMapping', 'projectRoleRules', 0, 'projectId'],
		},
	])('fails validation and names the rule: $rule', ({ rule: message, document, path }) => {
		const result = TrustedSourceConfigSchema.safeParse(document);

		expect(result.success).toBe(false);
		expect(issuesOf(result)).toContainEqual(expect.objectContaining({ path, message }));
	});

	test.each([
		{
			name: 'a role-mapping mode with a fallback role',
			document: withRoleMapping({ mode: 'on-provision', fallbackInstanceRole: 'global:member' }),
		},
		{
			name: 'jit provisioning with a role-mapping mode and a fallback role',
			document: withIdentity({
				provision: { human: 'jit' },
				roleMapping: {
					mode: 'continuous',
					fallbackInstanceRole: 'global:member',
					instanceRoleRules: [rule],
					projectRoleRules: [{ ...rule, id: 'r2', role: 'project:editor', projectId: 'p1' }],
				},
			}),
		},
		{
			name: 'manual discovery with a metadata URL',
			document: withAuthentication({
				discovery: { mode: 'manual', metadataUrl: 'https://idp.example.com/.well-known' },
			}),
		},
		{
			name: 'manual discovery without endpoints when keys come from the local keystore',
			document: withAuthentication({
				discovery: { mode: 'manual' },
				keys: { kind: 'local-keystore' },
			}),
		},
	])('accepts $name', ({ document }) => {
		expect(TrustedSourceConfigSchema.safeParse(document).success).toBe(true);
	});
});

describe('managedBy-gated fields', () => {
	const systemOnlyDocuments = [
		{
			field: 'identity.subject: n8n-user-id',
			document: withIdentity({ subject: 'n8n-user-id' }),
			path: ['identity', 'subject'],
		},
		{
			field: 'authentication.keys.kind: local-keystore',
			document: withAuthentication({ keys: { kind: 'local-keystore' } }),
			path: ['authentication', 'keys', 'kind'],
		},
		{
			field: 'authentication.client.kind: virtual',
			document: withAuthentication({ client: { kind: 'virtual' } }),
			path: ['authentication', 'client', 'kind'],
		},
	];

	test.each(systemOnlyDocuments)('$field is accepted for a system row', ({ document }) => {
		expect(trustedSourceConfigSchemaFor('system').safeParse(document).success).toBe(true);
	});

	test.each(systemOnlyDocuments)('$field is refused for an admin row', ({ document, path }) => {
		const result = trustedSourceConfigSchemaFor('admin').safeParse(document);

		expect(result.success).toBe(false);
		expect(issuesOf(result)).toContainEqual(
			expect.objectContaining({
				path,
				message: expect.stringContaining('only allowed on system-managed sources'),
			}),
		);
	});

	test('an admin row accepts a document without system-only fields', () => {
		const document = withAuthentication({ client: { kind: 'registered', clientId: 'n8n' } });

		expect(trustedSourceConfigSchemaFor('admin').safeParse(document).success).toBe(true);
	});
});

describe('claim mapping sources', () => {
	test('accepts an expression for a derived attribute', () => {
		const document = withIdentity({
			claimMapping: {
				...fullyDefaultedDocument.identity.claimMapping,
				displayName: '={{ $claims.given_name }} {{ $claims.family_name }}',
			},
		});

		expect(TrustedSourceConfigSchema.safeParse(document).success).toBe(true);
	});

	test('refuses an expression for the subject', () => {
		const document = withIdentity({
			claimMapping: {
				...fullyDefaultedDocument.identity.claimMapping,
				subject: '={{ $claims.oid }}',
			},
		});

		const result = TrustedSourceConfigSchema.safeParse(document);

		expect(result.success).toBe(false);
		expect(issuesOf(result)).toContainEqual(
			expect.objectContaining({ path: ['identity', 'claimMapping', 'subject'] }),
		);
	});
});

describe('algorithm allow-list inside authentication.algorithms', () => {
	test.each([
		{ name: 'none', algorithms: ['none'] },
		{ name: 'a single HMAC algorithm', algorithms: ['HS256'] },
		{ name: 'one valid and one HMAC algorithm', algorithms: ['RS256', 'HS512'] },
	])('rejects $name', ({ algorithms }) => {
		expect(TrustedSourceConfigSchema.safeParse(withAuthentication({ algorithms })).success).toBe(
			false,
		);
	});
});

describe('manual discovery endpoints must be https', () => {
	test.each(['metadataUrl', 'jwksUri', 'authorizationEndpoint', 'tokenEndpoint'])(
		'rejects a plain http %s',
		(field) => {
			const document = withAuthentication({
				discovery: {
					mode: 'manual',
					jwksUri: 'https://idp.example.com/jwks.json',
					[field]: 'http://idp.example.com/x',
				},
			});

			const result = TrustedSourceConfigSchema.safeParse(document);

			expect(result.success).toBe(false);
			expect(issuesOf(result)).toContainEqual(
				expect.objectContaining({ path: ['authentication', 'discovery', field] }),
			);
		},
	);
});

describe('TrustedSourceSecretsSchema', () => {
	test('accepts a client secret and refuses unknown keys', () => {
		expect(
			TrustedSourceSecretsSchema.safeParse({ version: 1, clientSecret: 's3cret' }).success,
		).toBe(true);
		expect(TrustedSourceSecretsSchema.safeParse({ version: 1, clientId: 'n8n' }).success).toBe(
			false,
		);
	});
});

describe('migrateToLatest', () => {
	const asConfig = (document: Record<string, unknown>) =>
		document as unknown as TrustedSourceConfig;

	test('returns a v1 document unchanged', () => {
		const parsed = TrustedSourceConfigSchema.parse(trustedSourceConfigV1Fixture);

		expect(migrateToLatest(parsed)).toEqual(trustedSourceConfigV1Fixture);
	});

	test('throws on a version without a migration', () => {
		expect(() =>
			migrateToLatest(asConfig({ ...trustedSourceConfigV1Fixture, version: 0 })),
		).toThrow('No migration from trusted source config version 0');
	});

	test('throws when a migration step does not advance the version', () => {
		configMigrations[0] = (config) => config;
		try {
			expect(() =>
				migrateToLatest(asConfig({ ...trustedSourceConfigV1Fixture, version: 0 })),
			).toThrow('did not advance the version');
		} finally {
			delete configMigrations[0];
		}
	});

	test.each([{ name: 'v1', fixture: trustedSourceConfigV1Fixture }])(
		'migrates the $name fixture to a document the latest schema accepts',
		({ fixture }) => {
			const parsed = TrustedSourceConfigSchema.parse(fixture);
			const migrated = migrateToLatest(parsed);

			expect(TrustedSourceConfigSchema.safeParse(migrated).success).toBe(true);
		},
	);
});
