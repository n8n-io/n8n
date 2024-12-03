import { Z } from 'zod-class';

import { projectNameSchema, projectSettingsSchema } from '../../schemas/project.schema';

export class CreateProjectDto extends Z.class({
	name: projectNameSchema,
	settings: projectSettingsSchema.optional(),
}) {}
