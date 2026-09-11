import { z } from 'zod';

import { appContentSchema, appLayoutSchema } from '../../schemas/app-content.schema';
import { pageRouteSchema, pageTitleSchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class CreatePageDto extends Z.class({
	route: pageRouteSchema,
	title: pageTitleSchema.optional(),
	parentPageId: z.string().optional(),
	content: appContentSchema.optional(),
	layout: appLayoutSchema.optional(),
}) {}
