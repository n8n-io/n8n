import { z } from 'zod';

import type { JsonSchemaObject, Serializable } from '../types';

export const parseEnum = (jsonSchema: JsonSchemaObject & { enum: Serializable[] }) => {
	if (jsonSchema.enum.length === 0) {
		return z.never();
	}

	if (jsonSchema.enum.length === 1) {
		// union does not work when there is only one element
		return z.literal(jsonSchema.enum[0] as z.core.util.Literal);
	}

	if (jsonSchema.enum.every((x) => typeof x === 'string')) {
		return z.enum(jsonSchema.enum as [string]);
	}

	return z.union(
		jsonSchema.enum.map((x) => z.literal(x as z.core.util.Literal)) as unknown as [
			z.ZodType,
			z.ZodType,
		],
	);
};
