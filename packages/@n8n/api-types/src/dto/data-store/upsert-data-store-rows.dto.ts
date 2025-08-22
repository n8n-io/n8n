import { z } from 'zod';
import { Z } from 'zod-class';

import {
	dataStoreColumnNameSchema,
	dataStoreColumnValueSchema,
} from '../../schemas/data-store.schema';

const upsertDataStoreRowsShape = {
	rows: z.array(z.record(dataStoreColumnNameSchema, dataStoreColumnValueSchema)),
	matchFields: z.array(dataStoreColumnNameSchema).min(1),
};

export class UpsertDataStoreRowsDto extends Z.class(upsertDataStoreRowsShape) {}
