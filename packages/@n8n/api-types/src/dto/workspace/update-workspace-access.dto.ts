import { z } from 'zod';

import { Z } from '../../zod-class';

/** PROTOTYPE (workspaces) */
export class UpdateWorkspaceAccessDto extends Z.class({
	isPublic: z.boolean().optional(),
	cascadeMembers: z.boolean().optional(),
}) {}
