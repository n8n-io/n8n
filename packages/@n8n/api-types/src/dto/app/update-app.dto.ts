import { appNameSchema, appNamespaceSchema, appVisibilitySchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class UpdateAppDto extends Z.class(
	{
		name: appNameSchema.optional(),
		namespace: appNamespaceSchema.optional(),
		visibility: appVisibilitySchema.optional(),
	},
	{ strict: true },
) {}
