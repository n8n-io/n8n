import { z } from 'zod';

import { Z } from '../../zod-class';

export class InstanceAiMcpUpdateConnectionRequestDto extends Z.class({
	inclusionMode: z.enum(['all', 'selected', 'except']).optional(),
	selectedTools: z.array(z.string()).optional(),
	excludedTools: z.array(z.string()).optional(),
}) {}
