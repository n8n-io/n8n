import {
	projectDescriptionSchema,
	projectIconSchema,
	projectNameSchema,
} from '../../schemas/project.schema';
import { Z } from '../../zod-class';

/** PROTOTYPE (workspaces) */
export class CreateWorkspaceDto extends Z.class({
	name: projectNameSchema,
	icon: projectIconSchema.optional(),
	description: projectDescriptionSchema.optional(),
}) {}
