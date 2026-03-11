import type { z } from 'zod';

import type { JsonSchemaObject } from '../types';

export function extendSchemaWithMessage<
	TIn extends z.ZodType,
	TOut extends z.ZodType,
	TJson extends JsonSchemaObject,
	TKey extends keyof TJson,
>(
	zodSchema: TIn,
	jsonSchema: TJson,
	key: TKey,
	extend: (zodSchema: TIn, value: NonNullable<TJson[TKey]>, errorMessage?: string) => TOut,
): TIn | TOut {
	const value = jsonSchema[key];

	if (value !== undefined) {
		const errorMessage = jsonSchema.errorMessage?.[key as string];
		return extend(zodSchema, value as NonNullable<TJson[TKey]>, errorMessage);
	}

	return zodSchema;
}
