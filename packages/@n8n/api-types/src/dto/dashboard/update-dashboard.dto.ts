import { z } from 'zod';

import { dashboardNameSchema, dashboardSpecSchema } from '../../schemas/dashboard.schema';
import { Z } from '../../zod-class';

export class UpdateDashboardDto extends Z.class({
	name: dashboardNameSchema.optional(),
	description: z.string().max(2048).nullable().optional(),
	spec: dashboardSpecSchema.optional(),
	tags: z.array(z.string().trim().min(1).max(64)).max(32).optional(),
	archived: z.boolean().optional(),
	/**
	 * Optimistic-concurrency token. When provided, the update succeeds only if
	 * the server-side `version` still matches; otherwise the controller returns
	 * 409 Conflict with the current version so the client can refresh and retry.
	 */
	expectedVersion: z.number().int().min(1).optional(),
}) {}
