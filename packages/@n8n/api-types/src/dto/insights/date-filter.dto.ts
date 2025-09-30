import { z } from 'zod';
import { Z } from 'zod-class';

import { insightsDateRangeSchema } from '../../schemas/insights.schema';

const VALID_DATE_RANGE_OPTIONS = insightsDateRangeSchema.shape.key.options;

// Date range parameter validation
const dateRange = z.enum(VALID_DATE_RANGE_OPTIONS).optional();

export class InsightsDateFilterDto extends Z.class({
	/**
	 * @deprecated use startDate and endDate instead
	 */
	dateRange,
	startDate: z.coerce.date().optional(),
	endDate: z.coerce.date().optional(),
	projectId: z.string().optional(),
}) {}
