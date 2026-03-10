import { z } from 'zod';

import { Z } from '../../zod-class';

export const VARIABLE_KEY_MAX_LENGTH = 50;
export const VALUE_MAX_LENGTH = 1000;
export const TYPE_ENUM = ['string'] as const;
export const TYPE_DEFAULT: (typeof TYPE_ENUM)[number] = 'string';

export const variableValueSchema = z
	.string()
	.max(VALUE_MAX_LENGTH, `value cannot be longer than ${VALUE_MAX_LENGTH} characters`);

export const variableTypeSchema = z.enum(TYPE_ENUM).default(TYPE_DEFAULT);

export class BaseVariableRequestDto extends Z.class({
	type: variableTypeSchema,
	value: variableValueSchema,
}) {}
