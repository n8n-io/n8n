import { z } from 'zod';

import { projectTypeSchema } from '../../schemas/project.schema';

const projectIconPublicSchema = z
	.object({
		type: z.enum(['emoji', 'icon']),
		value: z.string(),
	})
	.nullable();

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
