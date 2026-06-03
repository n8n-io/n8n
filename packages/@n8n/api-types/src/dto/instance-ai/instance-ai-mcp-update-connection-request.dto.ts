import { z } from 'zod';

import { Z } from '../../zod-class';

export class InstanceAiMcpUpdateConnectionRequestDto extends Z.class({
	toolFilter: z
		.object({
			mode: z.enum(['allow', 'exclude']),
			tools: z.array(z.string()),
		})
		.nullable(),
}) {}
