import { z } from 'zod';

import { Z } from '../../zod-class';

export class ListPageNodeReferencesQueryDto extends Z.class({
	workflowId: z.string().min(1),
}) {}
