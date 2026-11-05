import { Z } from '../../zod-class';
import {
	appVersionDescriptionSchema,
	appVersionNameSchema,
	appVersionSchema,
	appVisibilitySchema,
} from '../../schemas/app.schema';

export class PublishAppDto extends Z.class(
	{
		versionId: appVersionSchema.shape.id,
		label: appVersionNameSchema,
		description: appVersionDescriptionSchema.optional(),
		visibility: appVisibilitySchema.optional(),
	},
	{ strict: true },
) {}
