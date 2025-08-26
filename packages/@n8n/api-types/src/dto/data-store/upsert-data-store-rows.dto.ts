import { z } from 'zod';
import { Z } from 'zod-class';

import {
	dataStoreColumnNameSchema,
	dataStoreColumnValueSchema,
} from '../../schemas/data-store.schema';

const upsertDataStoreRowsShape = {
	rows: z.array(z.record(dataStoreColumnNameSchema, dataStoreColumnValueSchema)),
	matchFields: z.array(dataStoreColumnNameSchema).min(1),
	returnData: z.boolean().optional().default(false),
};

export class UpsertDataStoreRowsDto extends Z.class(upsertDataStoreRowsShape) {}
