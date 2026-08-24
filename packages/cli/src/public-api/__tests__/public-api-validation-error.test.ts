import { z, ZodError } from 'zod';

import { formatValidationError } from '@/public-api/public-api-validation-error';

/** Real Zod issues, so the shapes stay correct if Zod changes them. */
function errorFrom(schema: z.ZodTypeAny, data: unknown): ZodError {
	const result = schema.safeParse(data);
	if (result.success) throw new Error('Expected the schema to reject this input');
	return result.error;
}

const widget = z
	.object({
		name: z.string(),
		active: z.undefined({ invalid_type_error: 'is read-only' }),
		nested: z.object({ label: z.string() }).optional(),
		items: z.array(z.object({ id: z.string() })).optional(),
	})
	.strict();

describe('formatValidationError', () => {
	it('prefixes the location and the field path', () => {
		const message = formatValidationError('body', errorFrom(widget, { name: 1 }));

		expect(message).toBe('request/body/name Expected string, received number');
	});

	it('gives a fragment message its subject', () => {
		const message = formatValidationError('body', errorFrom(widget, { name: 'w', active: false }));

		expect(message).toBe('request/body/active is read-only');
	});

	it('joins a nested path with slashes', () => {
		const message = formatValidationError(
			'body',
			errorFrom(widget, { name: 'w', nested: { label: 1 } }),
		);

		expect(message).toBe('request/body/nested/label Expected string, received number');
	});

	it('renders an array index as a path segment', () => {
		const message = formatValidationError(
			'body',
			errorFrom(widget, { name: 'w', items: [{ id: 1 }] }),
		);

		expect(message).toBe('request/body/items/0/id Expected string, received number');
	});

	it('reports the location alone when the issue has no path', () => {
		const message = formatValidationError('body', errorFrom(widget, []));

		expect(message).toBe('request/body Expected object, received array');
	});

	it('uses the query location for a query DTO', () => {
		const limit = z.object({ limit: z.coerce.number() });

		const message = formatValidationError('query', errorFrom(limit, { limit: 'abc' }));

		expect(message).toBe('request/query/limit Expected number, received nan');
	});

	describe('a missing field keeps the legacy shape', () => {
		it('blames the containing object and names the field', () => {
			const message = formatValidationError('body', errorFrom(widget, {}));

			expect(message).toBe("request/body must have required property 'name'");
		});

		it('names the parent object for a nested field', () => {
			const message = formatValidationError('body', errorFrom(widget, { name: 'w', nested: {} }));

			expect(message).toBe("request/body/nested must have required property 'label'");
		});

		it('does not apply to a field that is present but the wrong type', () => {
			const message = formatValidationError('body', errorFrom(widget, { name: null }));

			expect(message).toBe('request/body/name Expected string, received null');
		});
	});

	it('falls back when the error carries no issues', () => {
		expect(formatValidationError('body', new ZodError([]))).toBe('Invalid request');
	});
});
