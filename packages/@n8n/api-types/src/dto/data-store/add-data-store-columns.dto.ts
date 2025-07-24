import { z } from 'zod';
import { Z } from 'zod-class';

import { dataStoreColumnSchema } from '../../schemas/data-store.schema';

export class AddDataStoreColumnsDto extends Z.class({
	columns: z.array(dataStoreColumnSchema),
}) {}
