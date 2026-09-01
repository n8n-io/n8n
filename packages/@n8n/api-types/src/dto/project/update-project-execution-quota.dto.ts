import { z } from 'zod';

import { Z } from '../../zod-class';

const updateProjectExecutionQuotaShape = {
	limit: z.number(),
	periodUnit: z.enum(['day', 'week', 'month']),
};

export class UpdateProjectExecutionQuotaDto extends Z.class(updateProjectExecutionQuotaShape) {}
