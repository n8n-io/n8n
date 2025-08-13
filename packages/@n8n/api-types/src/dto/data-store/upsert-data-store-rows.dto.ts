import { z } from 'zod';
import { Z } from 'zod-class';

import { dataStoreColumnNameSchema } from '../../schemas/data-store.schema';

const dataStoreValueSchema = z.union([z.string(), z.number(), z.boolean(), z.date(), z.null()]);

const upsertDataStoreRowsShape = {
	rows: z.array(z.record(dataStoreValueSchema)),
	matchFields: z.array(dataStoreColumnNameSchema).min(1),
};

export class UpsertDataStoreRowsDto extends Z.class(upsertDataStoreRowsShape) {}
