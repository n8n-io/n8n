import { z } from 'zod';
import { Z } from 'zod-class';

import { dataStoreColumnNameSchema } from '../../schemas/data-store.schema';

export class AddDataStoreRowsDto extends Z.class({
	data: z.array(z.record(dataStoreColumnNameSchema, z.any())),
}) {}
