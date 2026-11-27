import { z } from 'zod';

import { n8nIdSchema } from '../../schemas/id.schema';
import { Z } from '../../zod-class';

export class AddMcpServerToolsDto extends Z.class(
	{ workflowIds: z.array(n8nIdSchema).min(1).max(100) },
	{ strict: true },
) {}
