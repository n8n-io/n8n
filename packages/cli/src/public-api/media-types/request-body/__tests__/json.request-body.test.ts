import type { Request } from 'express';
import { z, ZodError } from 'zod';

import { jsonRequestBody } from '../json.request-body';

describe('jsonRequestBody', () => {
	it('reads req.body unchanged', () => {
		const req = { body: { a: 1 } } as unknown as Request;

		expect(jsonRequestBody.readInput(req)).toBe(req.body);
	});

	it('formats a validation error the same way the shared field-level formatter does', () => {
		try {
			z.object({ name: z.string() }).parse({});
		} catch (error) {
			assert(error instanceof ZodError, 'expected a ZodError');
			expect(jsonRequestBody.formatValidationError(error)).toBe(
				"request/body must have required property 'name'",
			);
		}
	});
});
