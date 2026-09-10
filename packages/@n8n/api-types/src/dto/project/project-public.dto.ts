import '../../openapi-extend';

import { z } from 'zod';

import { projectIconOpenApi } from './project-public.openapi';
import { nullableObjectGuardSchema } from '../../schemas/object-guard.schema';
import { projectTypeSchema, type ProjectIcon } from '../../schemas/project.schema';

// `icon` is a JSON column, so a strict schema would strip a stored `color` and answer 500 for a
// legacy shape. Check only the basic type, and let `.openapi()` document the shape.
const projectIconPublicSchema =
	nullableObjectGuardSchema<ProjectIcon>().openapi(projectIconOpenApi);

const projectCustomTelemetryTagPublicSchema = z.object({
	key: z.string(),
	value: z.string(),
});

/** The project as the Public API publishes it inside another resource. */
export const projectPublicSchema = z.object({
	id: z.string(),
	name: z.string(),
	type: projectTypeSchema,
	icon: projectIconPublicSchema,
	description: z.string().nullable(),
	customTelemetryTags: z.array(projectCustomTelemetryTagPublicSchema),
	creatorId: z.string().nullable(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});

export type ProjectPublic = z.infer<typeof projectPublicSchema>;
