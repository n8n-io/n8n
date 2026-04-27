import { z } from 'zod';

import { Z } from '../../zod-class';

export class InsightsProjectDateFilterDto extends Z.class({
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
}) {}
