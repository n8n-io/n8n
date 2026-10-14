import { z } from 'zod';

import { parseSchema } from './parse-schema';
import type { JsonSchemaObject, Refs } from '../types';

export const parseMultipleType = (
	jsonSchema: JsonSchemaObject & { type: string[] },
	refs: Refs,
) => {
	return z.union(
		jsonSchema.type.map((type) => parseSchema({ ...jsonSchema, type }, refs)) as [
			z.ZodTypeAny,
			z.ZodTypeAny,
		],
	);
};
