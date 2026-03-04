import { z } from 'zod';

import { Z } from '../../zod-class';

export class GetWorkflowDependenciesDto extends Z.class({
	workflowIds: z.array(z.string()).min(1).max(100),
}) {}
