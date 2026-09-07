import { z } from 'zod';

import { pageRouteSchema } from '../../schemas/app.schema';
import { Z } from '../../zod-class';

export class UpdatePageDto extends Z.class({
	route: pageRouteSchema.optional(),
	dataWorkflowId: z.string().nullable().optional(),
}) {}
