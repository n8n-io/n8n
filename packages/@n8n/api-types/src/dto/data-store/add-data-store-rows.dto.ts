import { z } from 'zod';
import { Z } from 'zod-class';

import {
	dataStoreColumnNameSchema,
	dataStoreColumnValueSchema,
	insertRowReturnType,
} from '../../schemas/data-store.schema';

export class AddDataStoreRowsDto extends Z.class({
	data: z.array(z.record(dataStoreColumnNameSchema, dataStoreColumnValueSchema)),
	returnType: insertRowReturnType,
}) {}
