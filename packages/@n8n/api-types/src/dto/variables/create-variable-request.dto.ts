import { z } from 'zod';

import { BaseVariableRequestDto, VARIABLE_KEY_MAX_LENGTH } from './base.dto';

export const NEW_VARIABLE_KEY_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const strictVariableKeySchema = z
	.string()
	.min(1, 'key must be at least 1 character long')
	.max(VARIABLE_KEY_MAX_LENGTH, 'key cannot be longer than 50 characters')
	.regex(
		NEW_VARIABLE_KEY_REGEX,
		'key can only contain letters, numbers (not as first character), and underscores (A-Za-z0-9_)',
	);

export class CreateVariableRequestDto extends BaseVariableRequestDto.extend({
	key: strictVariableKeySchema,
	projectId: z.string().max(36).optional(),
}) {}
