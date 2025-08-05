import { dataStoreColumnNameSchema } from 'schemas/data-store.schema';
import { z } from 'zod';
import { Z } from 'zod-class';

export class AddDataStoreRowsDto extends Z.class({
	records: z.array(z.record(dataStoreColumnNameSchema, z.any())),
}) {}
