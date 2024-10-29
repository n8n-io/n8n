import { z } from 'zod';

import { parseSchema } from './parse-schema';
import type { JsonSchemaObject, JsonSchema, Refs } from '../types';

export const parseIfThenElse = (
	jsonSchema: JsonSchemaObject & {
		if: JsonSchema;
		then: JsonSchema;
		else: JsonSchema;
	},
	refs: Refs,
) => {
	const $if = parseSchema(jsonSchema.if, { ...refs, path: [...refs.path, 'if'] });
	const $then = parseSchema(jsonSchema.then, {
		...refs,
		path: [...refs.path, 'then'],
	});
	const $else = parseSchema(jsonSchema.else, {
		...refs,
		path: [...refs.path, 'else'],
	});

	return z.union([$then, $else]).superRefine((value, ctx) => {
		const result = $if.safeParse(value).success ? $then.safeParse(value) : $else.safeParse(value);

		if (!result.success) {
			result.error.errors.forEach((error) => ctx.addIssue(error));
		}
	});
};
