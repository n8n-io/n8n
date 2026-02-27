import { z } from 'zod';

import {
	projectDescriptionSchema,
	projectIconSchema,
	projectNameSchema,
} from '../../schemas/project.schema';
import { Z } from '../../zod-class';

export class CreateProjectDto extends Z.class({
	name: projectNameSchema,
	icon: projectIconSchema.optional(),
	description: projectDescriptionSchema.optional(),
	uiContext: z.string().optional(),
}) {}
