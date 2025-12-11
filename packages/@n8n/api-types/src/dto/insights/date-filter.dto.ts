import { z } from 'zod';
import { Z } from 'zod-class';

export class InsightsDateFilterDto extends Z.class({
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	projectId: z.string().optional(),
}) {}
