import { z } from 'zod';

import { Z } from '../../zod-class';

export class GetSubWorkflowIdsDto extends Z.class({
	workflowIds: z.array(z.string()).min(1).max(500),
}) {}
