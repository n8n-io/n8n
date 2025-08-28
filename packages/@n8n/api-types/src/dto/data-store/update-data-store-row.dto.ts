import { z } from 'zod';
import { Z } from 'zod-class';

import { dataStoreFilterSchema } from '../../schemas/data-store-filter.schema';
import {
	dataStoreColumnNameSchema,
	dataStoreColumnValueSchema,
} from '../../schemas/data-store.schema';

// Reuse the shared filter schema but require at least one filter for updates
const updateFilterSchema = dataStoreFilterSchema.refine((filter) => filter.filters.length > 0, {
	message: 'filter must not be empty',
});

const updateDataStoreRowShape = {
	filter: updateFilterSchema,
	data: z
		.record(dataStoreColumnNameSchema, dataStoreColumnValueSchema)
		.refine((obj) => Object.keys(obj).length > 0, {
			message: 'data must not be empty',
		}),
	returnData: z.boolean().default(false),
};

export class UpdateDataStoreRowDto extends Z.class(updateDataStoreRowShape) {}
