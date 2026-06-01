import { z } from 'zod';

import { VARIABLE_KEY_MAX_LENGTH, variableTypeSchema, variableValueSchema } from './base.dto';
import { Z } from '../../zod-class';

/**
 * Please note that on the CreateVariableRequestDto we have made this regex
 * stricter by not allowing variable keys to start with a number, as that would break dot notation.
 * The Update DTO still supports it for backwards compatibility.
 */
const VARIABLE_KEY_REGEX = /^[A-Za-z0-9_]+$/;

const variableKeySchema = z
	.string()
	.min(1, 'key must be at least 1 character long')
	.max(VARIABLE_KEY_MAX_LENGTH, 'key cannot be longer than 50 characters')
	.regex(VARIABLE_KEY_REGEX, 'key can only contain characters A-Za-z0-9_');

export class UpdateVariableRequestDto extends Z.class({
	key: variableKeySchema.optional(),
	type: variableTypeSchema.optional(),
	value: variableValueSchema.optional(),
	projectId: z.string().max(36).optional().nullable(),
}) {}
