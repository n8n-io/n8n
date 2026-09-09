import { z } from 'zod';

import { appThemeSchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class ApplyAppThemeDto extends Z.class({
	theme: appThemeSchema,
	/** Thread whose sandbox holds the draft; the theme files are written there so the dev server shows them. */
	threadId: z.string().min(1).max(64).optional(),
}) {}
