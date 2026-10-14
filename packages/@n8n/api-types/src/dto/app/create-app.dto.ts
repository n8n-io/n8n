import { appNameSchema, appNamespaceSchema, appAuthSchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class CreateAppDto extends Z.class(
	{
		name: appNameSchema,
		namespace: appNamespaceSchema,
		auth: appAuthSchema.default('n8n'),
	},
	{ strict: true },
) {}
