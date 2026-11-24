import { z } from 'zod';

import { Z } from '../../zod-class';
import {
	appVersionDescriptionSchema,
	appVersionNameSchema,
	appVersionSchema,
} from '../../schemas/app.schema';

export class PublishAppDto extends Z.class(
	{
		versionId: appVersionSchema.shape.id,
		label: appVersionNameSchema,
		description: appVersionDescriptionSchema.optional(),
		publishResources: z.boolean().optional(),
	},
	{ strict: true },
) {}
