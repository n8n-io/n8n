import { ExternalTokenClaimsSchema, TrustedKeySourceSchema } from '../identity-substrate.schemas';

describe('identity-substrate.schemas', () => {
	describe('ExternalTokenClaimsSchema', () => {
		const validClaims = {
			sub: 'user-123',
			iss: 'https://idp.example.com',
			aud: 'my-service',
			iat: 1700000000,
			exp: 1700003600,
			jti: 'unique-jwt-id',
		};

		describe('valid input', () => {
			test('accepts minimal required claims', () => {
				expect(ExternalTokenClaimsSchema.safeParse(validClaims).success).toBe(true);
			});

			test('accepts aud as array of strings', () => {
				const result = ExternalTokenClaimsSchema.safeParse({
					...validClaims,
					aud: ['service-a', 'service-b'],
				});
				expect(result.success).toBe(true);
			});

			test('accepts all optional fields', () => {
				const result = ExternalTokenClaimsSchema.safeParse({
					...validClaims,
					email: 'alice@example.com',
					given_name: 'Alice',
					family_name: 'Smith',
					role: 'admin',
				});
				expect(result.success).toBe(true);
			});

			test('rejects role as array', () => {
				const result = ExternalTokenClaimsSchema.safeParse({
					...validClaims,
					role: ['admin', 'viewer'],
				});
				expect(result.success).toBe(false);
			});
		});

		describe('invalid input', () => {
			test.each([
				{
					name: 'missing sub',
					input: { ...validClaims, sub: undefined },
					errorPath: ['sub'],
				},
				{
					name: 'missing iss',
					input: { ...validClaims, iss: undefined },
					errorPath: ['iss'],
				},
				{
					name: 'iss is not a valid URL',
					input: { ...validClaims, iss: 'not-a-url' },
					errorPath: ['iss'],
				},
				{
					name: 'missing aud',
					input: { ...validClaims, aud: undefined },
					errorPath: ['aud'],
				},
				{
					name: 'missing iat',
					input: { ...validClaims, iat: undefined },
					errorPath: ['iat'],
				},
				{
					name: 'missing exp',
					input: { ...validClaims, exp: undefined },
					errorPath: ['exp'],
				},
				{
					name: 'missing jti',
					input: { ...validClaims, jti: undefined },
					errorPath: ['jti'],
				},
				{
					name: 'email is not a valid email',
					input: { ...validClaims, email: 'not-an-email' },
					errorPath: ['email'],
				},
				{
					name: 'sub is empty string',
					input: { ...validClaims, sub: '' },
					errorPath: ['sub'],
				},
				{
					name: 'jti is empty string',
					input: { ...validClaims, jti: '' },
					errorPath: ['jti'],
				},
			])('rejects $name', ({ input, errorPath }) => {
				const result = ExternalTokenClaimsSchema.safeParse(input);
				expect(result.success).toBe(false);
				expect(result.error?.issues[0].path).toEqual(errorPath);
			});
		});
	});

	describe('TrustedKeySourceSchema', () => {
		const validStatic = {
			type: 'static' as const,
			kid: 'key-1',
			algorithms: ['RS256'],
			key: '-----BEGIN PUBLIC KEY-----\nMIIBIjAN...\n-----END PUBLIC KEY-----',
			issuer: 'https://idp.example.com',
		};

		const validJwks = {
			type: 'jwks' as const,
			url: 'https://idp.example.com/.well-known/jwks.json',
			issuer: 'https://idp.example.com',
		};

		describe('static key source', () => {
			test('accepts valid static key source', () => {
				expect(TrustedKeySourceSchema.safeParse(validStatic).success).toBe(true);
			});

			test('accepts static key source with optional allowedRoles', () => {
				const result = TrustedKeySourceSchema.safeParse({
					...validStatic,
					allowedRoles: ['admin', 'viewer'],
				});
				expect(result.success).toBe(true);
			});

			test.each([
				{
					name: 'missing kid',
					input: { ...validStatic, kid: undefined },
					errorPath: ['kid'],
				},
				{
					name: 'missing algorithms',
					input: { ...validStatic, algorithms: undefined },
					errorPath: ['algorithms'],
				},
				{
					name: 'empty algorithms array',
					input: { ...validStatic, algorithms: [] },
					errorPath: ['algorithms'],
				},
				{
					name: 'missing key',
					input: { ...validStatic, key: undefined },
					errorPath: ['key'],
				},
				{
					name: 'missing issuer',
					input: { ...validStatic, issuer: undefined },
					errorPath: ['issuer'],
				},
			])('rejects static source with $name', ({ input, errorPath }) => {
				const result = TrustedKeySourceSchema.safeParse(input);
				expect(result.success).toBe(false);
				expect(result.error?.issues[0].path).toEqual(errorPath);
			});
		});

		describe('jwks key source', () => {
			test('accepts valid jwks key source', () => {
				expect(TrustedKeySourceSchema.safeParse(validJwks).success).toBe(true);
			});

			test('accepts jwks key source with all optional fields', () => {
				const result = TrustedKeySourceSchema.safeParse({
					...validJwks,
					allowedRoles: ['admin'],
					cacheTtlSeconds: 300,
				});
				expect(result.success).toBe(true);
			});

			test.each([
				{
					name: 'missing url',
					input: { ...validJwks, url: undefined },
					errorPath: ['url'],
				},
				{
					name: 'url is not a valid URL',
					input: { ...validJwks, url: 'not-a-url' },
					errorPath: ['url'],
				},
				{
					name: 'missing issuer',
					input: { ...validJwks, issuer: undefined },
					errorPath: ['issuer'],
				},
				{
					name: 'cacheTtlSeconds is zero',
					input: { ...validJwks, cacheTtlSeconds: 0 },
					errorPath: ['cacheTtlSeconds'],
				},
				{
					name: 'cacheTtlSeconds is negative',
					input: { ...validJwks, cacheTtlSeconds: -1 },
					errorPath: ['cacheTtlSeconds'],
				},
			])('rejects jwks source with $name', ({ input, errorPath }) => {
				const result = TrustedKeySourceSchema.safeParse(input);
				expect(result.success).toBe(false);
				expect(result.error?.issues[0].path).toEqual(errorPath);
			});
		});

		test('rejects unknown type', () => {
			const result = TrustedKeySourceSchema.safeParse({ type: 'unknown' });
			expect(result.success).toBe(false);
		});

		test('rejects input without type', () => {
			const result = TrustedKeySourceSchema.safeParse({ url: 'https://example.com' });
			expect(result.success).toBe(false);
		});
	});
});
