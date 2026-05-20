import { z } from 'zod';

import { dashboardNameSchema, dashboardSpecSchema } from '../../schemas/dashboard.schema';
import { Z } from '../../zod-class';

export class CreateDashboardDto extends Z.class({
	name: dashboardNameSchema,
	description: z.string().max(2048).optional(),
	spec: dashboardSpecSchema,
	tags: z.array(z.string().trim().min(1).max(64)).max(32).optional(),
}) {}
