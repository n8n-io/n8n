import { z } from 'zod';
import { Z } from 'zod-class';

import {
	projectNameSchema,
	projectSettingsSchema,
	projectRelationSchema,
} from '../../schemas/project.schema';

export class UpdateProjectDto extends Z.class({
	name: projectNameSchema.optional(),
	settings: projectSettingsSchema.optional(),
	relations: z.array(projectRelationSchema).optional(),
}) {}
