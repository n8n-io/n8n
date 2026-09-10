import { z } from 'zod';

import { appNameSchema, appNamespaceSchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class CreateAppDto extends Z.class({
	name: appNameSchema,
	namespace: appNamespaceSchema,
	/** Id of an `APP_LAYOUT_PRESETS` entry applied to the index page and the theme. */
	layoutPreset: z.string().max(32).optional(),
}) {}
