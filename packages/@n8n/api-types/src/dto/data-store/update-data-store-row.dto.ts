import { z } from 'zod';
import { Z } from 'zod-class';

import {
	dataStoreColumnNameSchema,
	dataStoreColumnValueSchema,
} from '../../schemas/data-store.schema';

const updateDataStoreRowShape = {
	filter: z
		.record(dataStoreColumnNameSchema, dataStoreColumnValueSchema)
		.refine((obj) => Object.keys(obj).length > 0, {
			message: 'filter must not be empty',
		}),
	data: z
		.record(dataStoreColumnNameSchema, dataStoreColumnValueSchema)
		.refine((obj) => Object.keys(obj).length > 0, {
			message: 'data must not be empty',
		}),
};

export class UpdateDataStoreRowDto extends Z.class(updateDataStoreRowShape) {}
