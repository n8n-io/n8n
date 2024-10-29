import type { z } from 'zod';

import type { JsonSchemaObject } from '../types';

export function extendSchemaWithMessage<
	TZod extends z.ZodTypeAny,
	TJson extends JsonSchemaObject,
	TKey extends keyof TJson,
>(
	zodSchema: TZod,
	jsonSchema: TJson,
	key: TKey,
	extend: (zodSchema: TZod, value: NonNullable<TJson[TKey]>, errorMessage?: string) => TZod,
) {
	const value = jsonSchema[key];

	if (value !== undefined) {
		const errorMessage = jsonSchema.errorMessage?.[key as string];
		return extend(zodSchema, value as NonNullable<TJson[TKey]>, errorMessage);
	}

	return zodSchema;
}
