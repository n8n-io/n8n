import { z } from 'zod';

import { Z } from '../../zod-class';

export const dashboardShareRoleSchema = z.enum(['viewer', 'editor']);
export type DashboardShareRole = z.infer<typeof dashboardShareRoleSchema>;

export class ShareDashboardDto extends Z.class({
	shareWithIds: z.array(z.string().min(1)).min(1).max(100),
	role: dashboardShareRoleSchema.default('viewer'),
}) {}

export class UnshareDashboardDto extends Z.class({
	userId: z.string().min(1),
}) {}
