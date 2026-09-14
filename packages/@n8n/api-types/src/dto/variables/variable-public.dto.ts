import '../../openapi-extend';
import { z } from 'zod';

import { Z } from '../../zod-class';
import { projectPublicSchema } from '../project/project-public.dto';

export const variablePublicSchema = z.object({
	id: z.string().openapi({ readOnly: true }),
	key: z.string(),
	value: z.string().openapi({ example: 'test' }),
	type: z.string().openapi({ readOnly: true }),
	project: projectPublicSchema.nullable(),
});

export type VariablePublic = z.infer<typeof variablePublicSchema>;

export class VariableListPublicDto extends Z.class({
	data: z.array(variablePublicSchema),
	nextCursor: z.string().nullable(),
}) {}
