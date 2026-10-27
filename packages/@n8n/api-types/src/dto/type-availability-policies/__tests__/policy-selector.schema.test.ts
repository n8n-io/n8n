import {
	credentialTypePolicySelectorSchema,
	nodeTypePolicySelectorSchema,
} from '../policy-selector.schema';

describe.each([
	['nodeTypePolicySelectorSchema', nodeTypePolicySelectorSchema],
	['credentialTypePolicySelectorSchema', credentialTypePolicySelectorSchema],
] as const)('%s', (_, schema) => {
	it('accepts a valid name selector', () => {
		expect(schema.safeParse({ kind: 'name', value: 'n8n-nodes-base.slack' }).success).toBe(true);
	});

	it('accepts a valid package selector', () => {
		expect(schema.safeParse({ kind: 'package', value: 'n8n-nodes-base' }).success).toBe(true);
	});

	it('rejects an empty value', () => {
		expect(schema.safeParse({ kind: 'name', value: '' }).success).toBe(false);
	});

	it('rejects an unknown kind', () => {
		expect(schema.safeParse({ kind: 'glob', value: '*' }).success).toBe(false);
	});

	it('rejects a selector missing its value', () => {
		expect(schema.safeParse({ kind: 'name' }).success).toBe(false);
	});
});

describe('extends selector', () => {
	const selector = { kind: 'extends', value: 'oAuth2Api' };

	it('is rejected by the node type schema', () => {
		expect(nodeTypePolicySelectorSchema.safeParse(selector).success).toBe(false);
	});

	it('is accepted by the credential type schema', () => {
		expect(credentialTypePolicySelectorSchema.safeParse(selector).success).toBe(true);
	});
});
