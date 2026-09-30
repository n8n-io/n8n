import { policySelectorSchema } from '../policy-selector.schema';

describe('policySelectorSchema', () => {
	it('accepts a valid name selector', () => {
		expect(
			policySelectorSchema.safeParse({ kind: 'name', value: 'n8n-nodes-base.slack' }).success,
		).toBe(true);
	});

	it('accepts a valid package selector', () => {
		expect(
			policySelectorSchema.safeParse({ kind: 'package', value: 'n8n-nodes-base' }).success,
		).toBe(true);
	});

	it('rejects an empty value', () => {
		expect(policySelectorSchema.safeParse({ kind: 'name', value: '' }).success).toBe(false);
	});

	it('rejects an unknown kind', () => {
		expect(policySelectorSchema.safeParse({ kind: 'glob', value: '*' }).success).toBe(false);
	});

	it('rejects a selector missing its value', () => {
		expect(policySelectorSchema.safeParse({ kind: 'name' }).success).toBe(false);
	});
});
