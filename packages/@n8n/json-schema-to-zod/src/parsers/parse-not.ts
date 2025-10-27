import { z } from 'zod';

import { parseSchema } from './parse-schema';
import type { JsonSchemaObject, JsonSchema, Refs } from '../types';

export const parseNot = (jsonSchema: JsonSchemaObject & { not: JsonSchema }, refs: Refs) => {
	return z.any().refine(
		(value) =>
			!parseSchema(jsonSchema.not, {
				...refs,
				path: [...refs.path, 'not'],
			}).safeParse(value).success,
		'Invalid input: Should NOT be valid against schema',
	);
};
