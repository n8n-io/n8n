import { z } from 'zod';

import { parseSchema } from './parse-schema';
import type { JsonSchemaObject, JsonSchema, Refs } from '../types';

export const parseOneOf = (jsonSchema: JsonSchemaObject & { oneOf: JsonSchema[] }, refs: Refs) => {
	if (!jsonSchema.oneOf.length) {
		return z.any();
	}

	if (jsonSchema.oneOf.length === 1) {
		return parseSchema(jsonSchema.oneOf[0], {
			...refs,
			path: [...refs.path, 'oneOf', 0],
		});
	}

	return z.any().superRefine((x, ctx) => {
		const schemas = jsonSchema.oneOf.map((schema, i) =>
			parseSchema(schema, {
				...refs,
				path: [...refs.path, 'oneOf', i],
			}),
		);

		const unionErrors = schemas.reduce<z.ZodError[]>(
			(errors, schema) =>
				((result) => (result.error ? [...errors, result.error] : errors))(schema.safeParse(x)),
			[],
		);

		if (schemas.length - unionErrors.length !== 1) {
			ctx.addIssue({
				path: ctx.path,
				code: 'invalid_union',
				unionErrors,
				message: 'Invalid input: Should pass single schema',
			});
		}
	});
};
