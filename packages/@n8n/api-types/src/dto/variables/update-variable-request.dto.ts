import { z } from 'zod';
import { Z } from 'zod-class';

import { variableKeySchema, variableTypeSchema, variableValueSchema } from './base.dto';

export class UpdateVariableRequestDto extends Z.class({
	key: variableKeySchema.optional(),
	type: variableTypeSchema.optional(),
	value: variableValueSchema.optional(),
	projectId: z.string().max(36).optional().nullable(),
}) {}
