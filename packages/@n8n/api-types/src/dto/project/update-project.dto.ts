import { z } from 'zod';
import { Z } from 'zod-class';

import {
	projectDescriptionSchema,
	projectIconSchema,
	projectNameSchema,
	projectRelationSchema,
} from '../../schemas/project.schema';

export class UpdateProjectDto extends Z.class({
	name: projectNameSchema.optional(),
	icon: projectIconSchema.optional(),
	description: projectDescriptionSchema.optional(),
	relations: z.array(projectRelationSchema).optional(),
}) {}
