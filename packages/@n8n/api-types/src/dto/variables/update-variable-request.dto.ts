import { z } from 'zod';

import { variableKeySchema, variableTypeSchema, variableValueSchema } from './base.dto';
import { Z } from '../../zod-class';

export class UpdateVariableRequestDto extends Z.class({
	key: variableKeySchema.optional(),
	type: variableTypeSchema.optional(),
	value: variableValueSchema.optional(),
	projectId: z.string().max(36).optional().nullable(),
}) {}
