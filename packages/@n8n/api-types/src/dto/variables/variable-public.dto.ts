import '../../openapi-extend';
import { z } from 'zod';

import { projectTypeSchema } from '../../schemas/project.schema';
import { Z } from '../../zod-class';

/**
 * Project a variable belongs to, narrowed to the three fields the variables spec documents.
 *
 * This is deliberately smaller than the project object on `GET /workflows`, which publishes the
 * whole entity, down to `creatorId` and `customTelemetryTags`. A variable identifies its project;
 * it does not describe it. Callers that need the full project read `GET /projects`.
 */
export const variableProjectPublicSchema = z.object({
	id: z.string().openapi({ readOnly: true, example: 'VmwOO9HeTEj20kxM' }),
	name: z.string(),
	type: projectTypeSchema.openapi({ readOnly: true }),
});

/** Public shape of a variable. Shared by every Public API variables endpoint. */
export const variablePublicSchema = z.object({
	id: z.string().openapi({ readOnly: true }),
	key: z.string(),
	value: z.string().openapi({ example: 'test' }),
	type: z.string().openapi({ readOnly: true }),
	/** `null` for a global variable, which belongs to no project. */
	project: variableProjectPublicSchema.nullable(),
});

export type VariablePublic = z.infer<typeof variablePublicSchema>;

export class VariableListPublicDto extends Z.class({
	data: z.array(variablePublicSchema),
	nextCursor: z.string().nullable(),
}) {}
