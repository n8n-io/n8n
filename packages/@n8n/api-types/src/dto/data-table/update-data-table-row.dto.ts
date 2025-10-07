import { z } from 'zod';
import { Z } from 'zod-class';

import { dataTableFilterSchema } from '../../schemas/data-table-filter.schema';
import {
	dataTableColumnNameSchema,
	dataTableColumnValueSchema,
} from '../../schemas/data-table.schema';

const updateFilterSchema = dataTableFilterSchema.refine((filter) => filter.filters.length > 0, {
	message: 'filter must not be empty',
});

const updateDataTableRowShape = {
	filter: updateFilterSchema,
	data: z
		.record(dataTableColumnNameSchema, dataTableColumnValueSchema)
		.refine((obj) => Object.keys(obj).length > 0, {
			message: 'data must not be empty',
		}),
	returnData: z.boolean().optional().default(false),
	dryRun: z.boolean().optional().default(false),
};

export class UpdateDataTableRowDto extends Z.class(updateDataTableRowShape) {}
