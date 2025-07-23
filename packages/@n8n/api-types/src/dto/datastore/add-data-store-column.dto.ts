import { Z } from 'zod-class';

import { dataStoreColumnSchema, dataStoreIdSchema } from '../../schemas/data-store.schema';

export class AddDataStoreColumnDto extends Z.class({
	id: dataStoreIdSchema,
	column: dataStoreColumnSchema,
}) {}
