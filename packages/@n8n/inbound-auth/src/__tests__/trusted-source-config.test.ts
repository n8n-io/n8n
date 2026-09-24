import {
	migrateToLatest,
	TrustedSourceConfigSchema,
	trustedSourceConfigSchemaFor,
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

describe('TrustedSourceConfigSchema defaults', () => {
	test('a minimal document with only version, authentication type and surfaces gets every default applied', () => {
		const result = TrustedSourceConfigSchema.safeParse(minimalDocument);

		expect(result.success).toBe(true);
		expect(result.success && result.data).toEqual(fullyDefaultedDocument);
	});
});

describe('TrustedSourceConfigSchema refinement rules', () => {
	test.each([
		{
			rule: 'jit provisioning requires a role-mapping mode',
			document: {
				...fullyDefaultedDocument,
				identity: {
					...fullyDefaultedDocument.identity,
					provision: { human: 'jit' },
					roleMapping: { mode: 'off', instanceRoleRules: [], projectRoleRules: [] },
				},
			},
		},
		{
			rule: 'a role-mapping mode requires a fallback role',
			document: {
				...fullyDefaultedDocument,
				identity: {
					...fullyDefaultedDocument.identity,
					roleMapping: { mode: 'on-provision', instanceRoleRules: [], projectRoleRules: [] },
				},
			},
		},
	])('fails validation and names the rule: $rule', ({ rule, document }) => {
		const result = TrustedSourceConfigSchema.safeParse(document);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((issue) => issue.message.includes(rule))).toBe(true);
		}
	});

	test('rejects a surface key that is not a registered surface id', () => {
		const document = { ...fullyDefaultedDocument, surfaces: { 'not-a-real-surface': {} } };

		const result = TrustedSourceConfigSchema.safeParse(document);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].path).toEqual(['surfaces', 'not-a-real-surface']);
		}
	});
});

describe('managedBy-gated fields', () => {
	const systemOnlyDocuments = [
		{
			field: 'identity.subject: n8n-user-id',
			document: {
				...fullyDefaultedDocument,
				identity: { ...fullyDefaultedDocument.identity, subject: 'n8n-user-id' },
			},
		},
		{
			field: 'authentication.keys.kind: local-keystore',
			document: {
				...fullyDefaultedDocument,
				authentication: {
					...fullyDefaultedDocument.authentication,
					keys: { kind: 'local-keystore' },
				},
			},
		},
		{
			field: 'authentication.client.kind: virtual',
			document: {
				...fullyDefaultedDocument,
				authentication: {
					...fullyDefaultedDocument.authentication,
					client: { kind: 'virtual' },
				},
			},
		},
	];

	test.each(systemOnlyDocuments)('$field is accepted for a system row', ({ document }) => {
		const result = trustedSourceConfigSchemaFor('system').safeParse(document);

		expect(result.success).toBe(true);
	});

	test.each(systemOnlyDocuments)('$field is refused for an admin row', ({ document }) => {
		const result = trustedSourceConfigSchemaFor('admin').safeParse(document);

		expect(result.success).toBe(false);
	});
});

describe('claim mapping sources', () => {
	test('accepts an expression for a derived attribute', () => {
		const document = {
			...fullyDefaultedDocument,
			identity: {
				...fullyDefaultedDocument.identity,
				claimMapping: {
					...fullyDefaultedDocument.identity.claimMapping,
					displayName: '={{ $claims.given_name }} {{ $claims.family_name }}',
				},
			},
		};

		expect(TrustedSourceConfigSchema.safeParse(document).success).toBe(true);
	});

	test('refuses an expression for the subject', () => {
		const document = {
			...fullyDefaultedDocument,
			identity: {
				...fullyDefaultedDocument.identity,
				claimMapping: {
					...fullyDefaultedDocument.identity.claimMapping,
					subject: '={{ $claims.oid }}',
				},
			},
		};

		const result = TrustedSourceConfigSchema.safeParse(document);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].path).toEqual(['identity', 'claimMapping', 'subject']);
		}
	});
});

describe('algorithm allow-list inside authentication.algorithms', () => {
	test.each([
		{ name: 'none', algorithms: ['none'] },
		{ name: 'a single HMAC algorithm', algorithms: ['HS256'] },
		{ name: 'one valid and one HMAC algorithm', algorithms: ['RS256', 'HS512'] },
	])('rejects $name', ({ algorithms }) => {
		const document = {
			...fullyDefaultedDocument,
			authentication: { ...fullyDefaultedDocument.authentication, algorithms },
		};

		const result = TrustedSourceConfigSchema.safeParse(document);

		expect(result.success).toBe(false);
	});
});

describe('manual discovery endpoints must be https', () => {
	test('rejects a plain http jwksUri', () => {
		const document = {
			...fullyDefaultedDocument,
			authentication: {
				...fullyDefaultedDocument.authentication,
				discovery: { mode: 'manual', jwksUri: 'http://idp.example.com/jwks.json' },
			},
		};

		const result = TrustedSourceConfigSchema.safeParse(document);

		expect(result.success).toBe(false);
	});
});

describe('migrateToLatest', () => {
	test('returns a v1 document unchanged', () => {
		const parsed = TrustedSourceConfigSchema.parse(trustedSourceConfigV1Fixture);

		expect(migrateToLatest(parsed)).toEqual(trustedSourceConfigV1Fixture);
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
