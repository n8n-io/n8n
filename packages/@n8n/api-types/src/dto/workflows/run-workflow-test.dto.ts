import { z } from 'zod';

import { Z } from '../../zod-class';

export class RunWorkflowTestDto extends Z.class({
	source: z.string().min(1),
	version: z.enum(['draft', 'published']).default('draft'),
}) {}
