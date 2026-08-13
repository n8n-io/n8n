import { z } from 'zod';

import { projectIconSchema, projectNameSchema } from '../../schemas/project.schema';
import { Z } from '../../zod-class';

export class CreateProjectDto extends Z.class({
	name: projectNameSchema,
	icon: projectIconSchema.optional(),
	uiContext: z.string().optional(),
}) {}
