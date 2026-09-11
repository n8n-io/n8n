import { appThemeSchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class ApplyAppThemeDto extends Z.class({
	theme: appThemeSchema,
}) {}
