import { z } from 'zod';

import {
	projectDescriptionSchema,
	projectIconSchema,
	projectNameSchema,
	projectRelationSchema,
} from '../../schemas/project.schema';
import { Z } from '../../zod-class';

const customTelemetryTagSchema = z.object({
	key: z.string().refine((k) => k.trim().length > 0, { message: 'Key must not be empty' }),
	value: z.string(),
});

const updateProjectShape = {
	name: projectNameSchema.optional(),
	icon: projectIconSchema.optional(),
	description: projectDescriptionSchema.optional(),
	customTelemetryTags: z
		.array(customTelemetryTagSchema)
		.refine(
			(tags) => {
				const trimmedKeys = tags.map((t) => t.key.trim());
				return trimmedKeys.length === new Set(trimmedKeys).size;
			},
			{ message: 'Duplicate keys are not allowed in customTelemetryTags' },
		)
		.optional(),
};

export class UpdateProjectDto extends Z.class(updateProjectShape) {}

export class UpdateProjectWithRelationsDto extends Z.class({
	...updateProjectShape,
	relations: z.array(projectRelationSchema).optional(),
}) {}
