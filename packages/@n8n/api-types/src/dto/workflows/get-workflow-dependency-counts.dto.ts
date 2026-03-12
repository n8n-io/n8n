import { z } from 'zod';

import { Z } from '../../zod-class';

export class GetWorkflowDependencyCountsDto extends Z.class({
	workflowIds: z.array(z.string()).min(1).max(100),
}) {}
