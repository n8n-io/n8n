import { z } from 'zod';
import { Z } from 'zod-class';

import { projectIconSchema, projectNameSchema } from '../../schemas/project.schema';

export class CreateProjectDto extends Z.class({
	name: projectNameSchema,
	icon: projectIconSchema.optional(),
	uiContext: z.string().optional(),
}) {}
