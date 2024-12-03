import { z } from 'zod';
import { Z } from 'zod-class';

import {
	projectIconSchema,
	projectNameSchema,
	projectRelationSchema,
	projectSettingsSchema,
} from '../../schemas/project.schema';

export class UpdateProjectDto extends Z.class({
	name: projectNameSchema.optional(),
	icon: projectIconSchema.optional(),
	settings: projectSettingsSchema.optional(),
	relations: z.array(projectRelationSchema).optional(),
}) {}
