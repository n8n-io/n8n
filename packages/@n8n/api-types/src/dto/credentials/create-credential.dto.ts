import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateCredentialDto extends Z.class({
	/** Optional pre-set id. Honored only under the instance-pull demo flag; otherwise auto-generated. */
	id: z.string().max(36).optional(),
	name: z.string().min(1).max(128),
	type: z.string().min(1).max(128),
	data: z.record(z.string(), z.unknown()),
	projectId: z.string().optional(),
	uiContext: z.string().optional(),
	isGlobal: z.boolean().optional(),
	isResolvable: z.boolean().optional(),
}) {}
