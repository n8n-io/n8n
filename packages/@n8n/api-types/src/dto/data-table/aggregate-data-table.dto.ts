import { z } from 'zod';

import {
	aggregateOpSchema,
	groupByDirectiveSchema,
	sortDirectiveSchema,
} from '../../schemas/dashboard.schema';
import { dataTableFilterSchema } from '../../schemas/data-table-filter.schema';
import { Z } from '../../zod-class';

export class AggregateDataTableDto extends Z.class({
	ops: z.array(aggregateOpSchema).min(1).max(16),
	groupBy: z.array(groupByDirectiveSchema).max(4).optional(),
	filter: dataTableFilterSchema.optional(),
	sort: z.array(sortDirectiveSchema).max(4).optional(),
	take: z.number().int().min(1).max(5000).optional(),
	skip: z.number().int().min(0).optional(),
}) {}
