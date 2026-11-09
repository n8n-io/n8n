import { z } from 'zod';

import { Z } from '../../zod-class';

export class NotifyMigrationOwnersRequestDto extends Z.class({
	workflowIds: z.array(z.string().min(1)).min(1),
}) {}
