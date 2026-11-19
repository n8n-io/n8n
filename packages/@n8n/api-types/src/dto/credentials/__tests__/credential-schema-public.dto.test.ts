import { CredentialSchemaPublicDto } from '../credential-public.dto';

describe('CredentialSchemaPublicDto', () => {
	test('accepts a flat schema with no allOf', () => {
		const result = CredentialSchemaPublicDto.safeParse({
			additionalProperties: false,
			type: 'object',
			properties: { apiKey: { type: 'string' }, domain: { type: 'string' } },
			required: ['apiKey', 'domain'],
		});

		expect(result.success).toBe(true);
	});

	test('accepts a schema with allOf conditionals, and keeps their content untouched', () => {
		const allOf = [
			{
				if: { properties: { keyType: { enum: ['pemKey'] } }, required: ['keyType'] },
				then: { allOf: [{ required: ['privateKey'] }] },
			},
		];

		const result = CredentialSchemaPublicDto.safeParse({
			additionalProperties: false,
			type: 'object',
			properties: { keyType: { type: 'string', enum: ['passphrase', 'pemKey'] } },
			required: [],
			allOf,
		});

		expect(result).toMatchObject({ success: true, data: { allOf } });
	});

	test('passes through per-property content unchanged, including nested enum arrays', () => {
		const properties = { authType: { type: 'string', enum: ['basic', 'oauth2'] } };

		const result = CredentialSchemaPublicDto.safeParse({
			additionalProperties: false,
			type: 'object',
			properties,
			required: ['authType'],
		});

		expect(result).toMatchObject({ success: true, data: { properties } });
	});

	test('rejects an unknown top-level key', () => {
		const result = CredentialSchemaPublicDto.safeParse({
			additionalProperties: false,
			type: 'object',
			properties: {},
			required: [],
			somethingElse: true,
		});

		expect(result.success).toBe(false);
	});

	test.each([
		['additionalProperties', { additionalProperties: true }],
		['type', { type: 'array' }],
	])('rejects a wrong literal value for %s', (_name, override) => {
		const result = CredentialSchemaPublicDto.safeParse({
			additionalProperties: false,
			type: 'object',
			properties: {},
			required: [],
			...override,
		});

		expect(result.success).toBe(false);
	});

	test('rejects a missing required field', () => {
		const result = CredentialSchemaPublicDto.safeParse({
			additionalProperties: false,
			type: 'object',
			properties: {},
		});

		expect(result.success).toBe(false);
	});
});
