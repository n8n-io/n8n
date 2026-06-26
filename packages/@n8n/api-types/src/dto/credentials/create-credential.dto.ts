import { z } from 'zod';

import { Z } from '../../zod-class';

export class CreateCredentialDto extends Z.class({
	name: z.string().min(1).max(128),
	type: z.string().min(1).max(128),
	data: z.record(z.string(), z.unknown()),
	projectId: z.string().optional(),
	uiContext: z.string().optional(),
	isGlobal: z.boolean().optional(),
	isResolvable: z.boolean().optional(),
	/**
	 * Preset credential id. Honoured ONLY when the instance-pull demo flag is on
	 * (lets prd create a credential whose id matches the dev source id). Ignored otherwise.
	 */
	id: z.string().max(36).optional(),
}) {}
