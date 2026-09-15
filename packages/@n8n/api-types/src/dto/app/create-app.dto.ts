import { appNameSchema, appNamespaceSchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class CreateAppDto extends Z.class({
	name: appNameSchema,
	namespace: appNamespaceSchema,
}) {}
