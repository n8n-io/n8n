import { z } from 'zod';
import { Z } from 'zod-class';

import { dataStoreColumnNameSchema } from '../../schemas/data-store.schema';

export class DeleteDataStoreColumnsDto extends Z.class({
	columnNames: z.array(dataStoreColumnNameSchema),
}) {}
