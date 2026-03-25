import { z } from 'zod';

import { matchesDisplayOptions, resolveSchema } from './resolve-schema';

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

describe('resolveSchema error messages for hidden fields', () => {
	const stringSchema = z.string();

	it('provides descriptive error message when field should be hidden due to show condition', () => {
		const schema = resolveSchema({
			parameters: { sendBody: false },
			schema: stringSchema,
			required: false,
			displayOptions: { show: { sendBody: [true] } },
		});

		// Field is hidden (sendBody=false, but show requires sendBody=true)
		// Providing a value should fail with a descriptive message
		const result = schema.safeParse('some-value');
		expect(result.success).toBe(false);
		if (!result.success) {
			const errorMessage = result.error.issues[0].message;
			expect(errorMessage).toContain('sendBody');
			expect(errorMessage).toContain('true');
		}
	});

	it('provides descriptive error message with multiple show conditions', () => {
		const schema = resolveSchema({
			parameters: { sendBody: false, contentType: 'json' },
			schema: stringSchema,
			required: false,
			displayOptions: { show: { sendBody: [true], contentType: ['json', 'form-urlencoded'] } },
		});

		const result = schema.safeParse('some-value');
		expect(result.success).toBe(false);
		if (!result.success) {
			const errorMessage = result.error.issues[0].message;
			// Should mention the unmet condition (sendBody)
			expect(errorMessage).toContain('sendBody');
			expect(errorMessage).toContain('true');
		}
	});

	it('provides descriptive error message showing multiple valid options', () => {
		const schema = resolveSchema({
			parameters: { contentType: 'raw' },
			schema: stringSchema,
			required: false,
			displayOptions: { show: { contentType: ['json', 'form-urlencoded'] } },
		});

		const result = schema.safeParse('some-value');
		expect(result.success).toBe(false);
		if (!result.success) {
			const errorMessage = result.error.issues[0].message;
			expect(errorMessage).toContain('contentType');
			expect(errorMessage).toMatch(/json|form-urlencoded/);
		}
	});

	it('formats boolean values without quotes', () => {
		const schema = resolveSchema({
			parameters: { hasOutputParser: false },
			schema: z.object({ name: z.string() }),
			required: false,
			displayOptions: { show: { hasOutputParser: [true] } },
		});

		const result = schema.safeParse({ name: 'parser' });
		expect(result.success).toBe(false);
		if (!result.success) {
			const errorMessage = result.error.issues[0].message;
			expect(errorMessage).toContain('hasOutputParser');
			expect(errorMessage).toContain('true');
			// Boolean should not be quoted as "true"
			expect(errorMessage).not.toMatch(/hasOutputParser="true"/);
		}
	});
});

describe('resolveSchema with defaults', () => {
	const stringSchema = z.string();

	it('uses default value when parameter is not set and show condition includes default', () => {
		// This is the Webhook httpMethod use case:
		// displayOptions: {"show":{"multipleMethods":[false, true]}}
		// multipleMethods defaults to false
		const schema = resolveSchema({
			parameters: {}, // multipleMethods not explicitly set
			schema: stringSchema,
			required: false,
			displayOptions: { show: { multipleMethods: [false, true] } },
			defaults: { multipleMethods: false },
		});

		// Field should be visible because default (false) is in [false, true]
		const result = schema.safeParse('GET');
		expect(result.success).toBe(true);
	});

	it('returns z.undefined() when default does not match show condition', () => {
		const schema = resolveSchema({
			parameters: {},
			schema: stringSchema,
			required: true,
			displayOptions: { show: { mode: ['advanced'] } },
			defaults: { mode: 'simple' },
		});

		// Field should not be visible because default (simple) is not in [advanced]
		const result = schema.safeParse(undefined);
		expect(result.success).toBe(true);

		const result2 = schema.safeParse('some-value');
		expect(result2.success).toBe(false);
	});

	it('prefers explicit parameter value over default', () => {
		// When parameter is explicitly set, it should take precedence over default
		const schema = resolveSchema({
			parameters: { mode: 'advanced' },
			schema: stringSchema,
			required: true,
			displayOptions: { show: { mode: ['advanced'] } },
			defaults: { mode: 'simple' },
		});

		// Field should be visible because explicit value (advanced) matches
		const result = schema.safeParse('some-value');
		expect(result.success).toBe(true);
	});

	it('handles boolean default values correctly', () => {
		const schema = resolveSchema({
			parameters: {},
			schema: stringSchema,
			required: false,
			displayOptions: { show: { enabled: [true] } },
			defaults: { enabled: false },
		});

		// Field should NOT be visible because default (false) is not in [true]
		const result = schema.safeParse(undefined);
		expect(result.success).toBe(true);

		const result2 = schema.safeParse('value');
		expect(result2.success).toBe(false);
	});

	// Simulating the actual Webhook httpMethod scenario
	function getWebhookParametersSchema({
		parameters,
		resolveSchema: resolve,
	}: {
		parameters: Record<string, unknown>;
		resolveSchema: typeof resolveSchema;
	}) {
		// Extract defaults for displayOptions (simulates what generateConditionalSchemaLine does)
		const httpMethodDefaults = { multipleMethods: false };

		return z.object({
			// multipleMethods defaults to false
			multipleMethods: z.boolean().optional(),
			// httpMethod has displayOptions: {"show":{"multipleMethods":[false, true]}}
			httpMethod: resolve({
				parameters,
				schema: z.enum(['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'PATCH']),
				required: false,
				displayOptions: { show: { multipleMethods: [false, true] } },
				defaults: httpMethodDefaults,
			}),
		});
	}

	it('Webhook httpMethod scenario: allows httpMethod when multipleMethods is not set (defaults to false)', () => {
		const params = {
			// multipleMethods is NOT set - should use default of false
			httpMethod: 'POST',
		};

		const schema = getWebhookParametersSchema({
			parameters: params,
			resolveSchema,
		});

		const result = schema.safeParse(params);
		expect(result.success).toBe(true);
	});

	it('Webhook httpMethod scenario: allows httpMethod when multipleMethods is explicitly false', () => {
		const params = {
			multipleMethods: false,
			httpMethod: 'POST',
		};

		const schema = getWebhookParametersSchema({
			parameters: params,
			resolveSchema,
		});

		const result = schema.safeParse(params);
		expect(result.success).toBe(true);
	});

	it('Webhook httpMethod scenario: allows httpMethod when multipleMethods is explicitly true', () => {
		const params = {
			multipleMethods: true,
			httpMethod: 'POST',
		};

		const schema = getWebhookParametersSchema({
			parameters: params,
			resolveSchema,
		});

		const result = schema.safeParse(params);
		expect(result.success).toBe(true);
	});
});
