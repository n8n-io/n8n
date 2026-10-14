import { appNameSchema, appNamespaceSchema, appAuthSchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class UpdateAppDto extends Z.class(
	{
		name: appNameSchema.optional(),
		namespace: appNamespaceSchema.optional(),
		auth: appAuthSchema.optional(),
	},
	{ strict: true },
) {}
