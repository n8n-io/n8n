import { z } from 'zod';

import { Z } from '../../zod-class';

export class AddMcpServerToolsDto extends Z.class(
	{ workflowIds: z.array(z.string().min(1)).min(1).max(100) },
	{ strict: true },
) {}
