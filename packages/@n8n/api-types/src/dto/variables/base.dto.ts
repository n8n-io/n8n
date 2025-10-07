import { z } from 'zod';
import { Z } from 'zod-class';

export const KEY_NAME_REGEX = /^[A-Za-z0-9_]+$/;
export const KEY_MAX_LENGTH = 50;
export const VALUE_MAX_LENGTH = 1000;
export const TYPE_ENUM = ['string'] as const;
export const TYPE_DEFAULT: (typeof TYPE_ENUM)[number] = 'string';

export const variableKeySchema = z
	.string()
	.min(1, 'key must be at least 1 character long')
	.max(KEY_MAX_LENGTH, 'key cannot be longer than 50 characters')
	.regex(KEY_NAME_REGEX, 'key can only contain characters A-Za-z0-9_');

export const variableValueSchema = z
	.string()
	.max(VALUE_MAX_LENGTH, `value cannot be longer than ${VALUE_MAX_LENGTH} characters`);

export const variableTypeSchema = z.enum(TYPE_ENUM).default(TYPE_DEFAULT);

export class BaseVariableRequestDto extends Z.class({
	key: variableKeySchema,
	type: variableTypeSchema,
	value: variableValueSchema,
}) {}
