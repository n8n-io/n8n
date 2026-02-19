import { z } from 'zod';

import { Z } from '../../zod-class';

export class ListExecutionQuotaQueryDto extends Z.class({
	projectId: z.string().max(36).optional(),
}) {}
