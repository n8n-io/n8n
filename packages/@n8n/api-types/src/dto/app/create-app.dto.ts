import { appNameSchema, appNamespaceSchema, appVisibilitySchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class CreateAppDto extends Z.class(
	{
		name: appNameSchema,
		namespace: appNamespaceSchema,
		visibility: appVisibilitySchema.default('project'),
	},
	{ strict: true },
) {}
