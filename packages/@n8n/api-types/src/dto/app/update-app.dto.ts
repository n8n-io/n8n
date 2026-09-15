import { appNameSchema, appNamespaceSchema, appThemeSchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class UpdateAppDto extends Z.class({
	name: appNameSchema.optional(),
	namespace: appNamespaceSchema.optional(),
	theme: appThemeSchema.optional(),
}) {}
