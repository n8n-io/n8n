import { z } from 'zod';
import { Z } from 'zod-class';

import {
	dataStoreColumnNameSchema,
	dataStoreColumnValueSchema,
} from '../../schemas/data-store.schema';

export class AddDataStoreRowsDto extends Z.class({
	returnData: z.boolean().default(false),
	data: z.array(z.record(dataStoreColumnNameSchema, dataStoreColumnValueSchema)),
}) {}
