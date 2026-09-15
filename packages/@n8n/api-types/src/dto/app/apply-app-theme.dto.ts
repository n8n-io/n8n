import { appThemeSettingsSchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class ApplyAppThemeDto extends Z.class({
	settings: appThemeSettingsSchema,
}) {}
