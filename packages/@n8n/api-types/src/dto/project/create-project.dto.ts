import { Z } from 'zod-class';

import {
	projectIconSchema,
	projectNameSchema,
	projectSettingsSchema,
} from '../../schemas/project.schema';

export class CreateProjectDto extends Z.class({
	name: projectNameSchema,
	icon: projectIconSchema.optional(),
	settings: projectSettingsSchema.default({}).optional(),
}) {}
