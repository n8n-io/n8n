import { z } from 'zod';

import { Z } from '../../zod-class';

export class GenerateStickyNoteDto extends Z.class({
	nodes: z
		.array(
			z.object({
				name: z.string(),
				type: z.string(),
				disabled: z.boolean().optional(),
				parameters: z.record(z.string(), z.unknown()).default({}),
			}),
		)
		.min(1),
}) {}
