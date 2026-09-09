import '../../openapi-extend';
import { z } from 'zod';

import { projectTypeSchema } from '../../schemas/project.schema';
import { Z } from '../../zod-class';

/** Narrower than the project on `GET /workflows`: a variable identifies its project. */
export const variableProjectPublicSchema = z.object({
	id: z.string().openapi({ readOnly: true, example: 'VmwOO9HeTEj20kxM' }),
	name: z.string(),
	type: projectTypeSchema.openapi({ readOnly: true }),
});

export const variablePublicSchema = z.object({
	id: z.string().openapi({ readOnly: true }),
	key: z.string(),
	value: z.string().openapi({ example: 'test' }),
	type: z.string().openapi({ readOnly: true }),
	project: variableProjectPublicSchema.nullable(),
});

export type VariablePublic = z.infer<typeof variablePublicSchema>;

export class VariableListPublicDto extends Z.class({
	data: z.array(variablePublicSchema),
	nextCursor: z.string().nullable(),
}) {}
