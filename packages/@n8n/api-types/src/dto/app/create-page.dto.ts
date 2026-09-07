import { z } from 'zod';

import { pageRouteSchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class CreatePageDto extends Z.class({
	route: pageRouteSchema,
	parentPageId: z.string().optional(),
}) {}
