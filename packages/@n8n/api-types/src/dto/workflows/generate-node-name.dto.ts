import { z } from 'zod';

import { Z } from '../../zod-class';

export class GenerateNodeNameDto extends Z.class({
	node: z.object({
		name: z.string(),
		type: z.string(),
		disabled: z.boolean().optional(),
		parameters: z.record(z.string(), z.unknown()).default({}),
	}),
}) {}
