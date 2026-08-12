import { clearValidatorCache, validateRequestBody } from './validation';

const orderSchema = JSON.stringify({
	type: 'object',
	required: ['sku', 'quantity'],
	properties: {
		sku: { type: 'string' },
		quantity: { type: 'integer', minimum: 1 },
		email: { type: 'string', format: 'email' },
	},
});

beforeEach(clearValidatorCache);

describe('validateRequestBody', () => {
	it('accepts a conforming body', async () => {
		await expect(validateRequestBody(orderSchema, { sku: 'a1', quantity: 2 })).resolves.toEqual({
			valid: true,
		});
	});

	it('reports every violation at once', async () => {
		const outcome = await validateRequestBody(orderSchema, { quantity: 0 });

		expect(outcome.valid).toBe(false);
		expect(!outcome.valid && outcome.errors).toEqual([
			{ path: '/', message: "must have required property 'sku'" },
			{ path: '/quantity', message: 'must be >= 1' },
		]);
	});

	it('enforces formats from ajv-formats', async () => {
		const outcome = await validateRequestBody(orderSchema, {
			sku: 'a1',
			quantity: 1,
			email: 'not-an-email',
		});

		expect(!outcome.valid && outcome.errors).toEqual([
			{ path: '/email', message: 'must match format "email"' },
		]);
	});

	it('accepts everything when no schema is configured', async () => {
		await expect(validateRequestBody(undefined, { anything: true })).resolves.toEqual({
			valid: true,
		});
		await expect(validateRequestBody('   ', { anything: true })).resolves.toEqual({ valid: true });
	});

	it('accepts everything when the schema cannot be compiled', async () => {
		await expect(validateRequestBody('{ not json', {})).resolves.toEqual({ valid: true });
		await expect(validateRequestBody('{"type":"nonsense"}', {})).resolves.toEqual({ valid: true });
	});

	it('reuses the compiled validator for the same schema', async () => {
		const first = await validateRequestBody(orderSchema, { sku: 'a', quantity: 1 });
		const second = await validateRequestBody(orderSchema, { sku: 'a', quantity: 1 });

		expect(first).toEqual(second);
	});
});
