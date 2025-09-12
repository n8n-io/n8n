import { z } from 'zod';
import { Z } from 'zod-class';

import {
	dataStoreColumnNameSchema,
	dataStoreColumnValueSchema,
} from '../../schemas/data-store.schema';
import { dataTableFilterSchema } from '../../schemas/data-table-filter.schema';

const updateFilterSchema = dataTableFilterSchema.refine((filter) => filter.filters.length > 0, {
	message: 'filter must not be empty',
});

const updateDataTableRowShape = {
	filter: updateFilterSchema,
	data: z
		.record(dataStoreColumnNameSchema, dataStoreColumnValueSchema)
		.refine((obj) => Object.keys(obj).length > 0, {
			message: 'data must not be empty',
		}),
	returnData: z.boolean().optional().default(false),
};

export class UpdateDataTableRowDto extends Z.class(updateDataTableRowShape) {}
