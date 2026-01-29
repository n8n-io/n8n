import { z } from 'zod';
import { matchesDisplayOptions, resolveSchema } from '../validation/resolve-schema';

describe('matchesDisplayOptions', () => {
	describe('show conditions', () => {
		it('returns true when show condition matches', () => {
			const result = matchesDisplayOptions(
				{ authentication: 'predefinedCredentialType' },
				{ show: { authentication: ['predefinedCredentialType'] } },
			);
			expect(result).toBe(true);
		});

		it('returns false when show condition does not match', () => {
			const result = matchesDisplayOptions(
				{ authentication: 'none' },
				{ show: { authentication: ['predefinedCredentialType'] } },
			);
			expect(result).toBe(false);
		});

		it('returns true when all show conditions match', () => {
			const result = matchesDisplayOptions(
				{ authentication: 'genericCredentialType', method: 'POST' },
				{ show: { authentication: ['genericCredentialType'], method: ['POST', 'PUT'] } },
			);
			expect(result).toBe(true);
		});

		it('returns false when any show condition fails', () => {
			const result = matchesDisplayOptions(
				{ authentication: 'genericCredentialType', method: 'GET' },
				{ show: { authentication: ['genericCredentialType'], method: ['POST', 'PUT'] } },
			);
			expect(result).toBe(false);
		});
	});

	describe('hide conditions', () => {
		it('returns false when hide condition matches', () => {
			const result = matchesDisplayOptions(
				{ authentication: 'none' },
				{ hide: { authentication: ['none'] } },
			);
			expect(result).toBe(false);
		});

		it('returns true when hide condition does not match', () => {
			const result = matchesDisplayOptions(
				{ authentication: 'predefinedCredentialType' },
				{ hide: { authentication: ['none'] } },
			);
			expect(result).toBe(true);
		});
	});

	describe('no conditions', () => {
		it('returns true when no displayOptions', () => {
			const result = matchesDisplayOptions({ anything: 'value' }, {});
			expect(result).toBe(true);
		});
	});
});

describe('resolveSchema', () => {
	const stringSchema = z.string();

	it('returns required schema when conditions match and required is true', () => {
		const schema = resolveSchema({
			parameters: { authentication: 'predefinedCredentialType' },
			schema: stringSchema,
			required: true,
			displayOptions: { show: { authentication: ['predefinedCredentialType'] } },
		});

		// Should fail validation when value is missing
		const result = schema.safeParse(undefined);
		expect(result.success).toBe(false);

		// Should pass when value is present
		const result2 = schema.safeParse('some-value');
		expect(result2.success).toBe(true);
	});

	it('returns optional schema when conditions match and required is false', () => {
		const schema = resolveSchema({
			parameters: { authentication: 'predefinedCredentialType' },
			schema: stringSchema,
			required: false,
			displayOptions: { show: { authentication: ['predefinedCredentialType'] } },
		});

		// Should pass when value is missing (optional)
		const result = schema.safeParse(undefined);
		expect(result.success).toBe(true);

		// Should pass when value is present
		const result2 = schema.safeParse('some-value');
		expect(result2.success).toBe(true);
	});

	it('returns z.undefined() when conditions do not match', () => {
		const schema = resolveSchema({
			parameters: { authentication: 'none' },
			schema: stringSchema,
			required: true,
			displayOptions: { show: { authentication: ['predefinedCredentialType'] } },
		});

		// Should pass with undefined (field not shown)
		const result = schema.safeParse(undefined);
		expect(result.success).toBe(true);

		// Should fail with any non-undefined value when field is not visible
		const result2 = schema.safeParse(12345);
		expect(result2.success).toBe(false);

		const result3 = schema.safeParse('some-string');
		expect(result3.success).toBe(false);
	});
});

describe('Schema factory integration', () => {
	// Simulate what a generated schema factory would look like
	function getHttpRequestParametersSchema({
		parameters,
		resolveSchema: resolve,
	}: {
		parameters: Record<string, unknown>;
		resolveSchema: typeof resolveSchema;
	}) {
		return z.object({
			url: z.string(),
			authentication: z.enum(['none', 'predefinedCredentialType', 'genericCredentialType']),
			// nodeCredentialType is conditionally required based on authentication
			nodeCredentialType: resolve({
				parameters,
				schema: z.string(),
				required: true,
				displayOptions: { show: { authentication: ['predefinedCredentialType'] } },
			}),
		});
	}

	it('validates nodeCredentialType as required when authentication is predefinedCredentialType', () => {
		const params = {
			url: 'https://example.com',
			authentication: 'predefinedCredentialType',
			// nodeCredentialType is missing - should fail
		};

		const schema = getHttpRequestParametersSchema({
			parameters: params,
			resolveSchema,
		});

		const result = schema.safeParse(params);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues.some((i) => i.path.includes('nodeCredentialType'))).toBe(true);
		}
	});

	it('does not require nodeCredentialType when authentication is none', () => {
		const params = {
			url: 'https://example.com',
			authentication: 'none',
			// nodeCredentialType is missing - should pass (not shown)
		};

		const schema = getHttpRequestParametersSchema({
			parameters: params,
			resolveSchema,
		});

		const result = schema.safeParse(params);

		expect(result.success).toBe(true);
	});

	it('accepts nodeCredentialType when authentication is predefinedCredentialType', () => {
		const params = {
			url: 'https://example.com',
			authentication: 'predefinedCredentialType',
			nodeCredentialType: 'slackApi',
		};

		const schema = getHttpRequestParametersSchema({
			parameters: params,
			resolveSchema,
		});

		const result = schema.safeParse(params);

		expect(result.success).toBe(true);
	});
});
