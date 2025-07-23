import { Z } from 'zod-class';

import { dataStoreColumnNameSchema, dataStoreIdSchema } from '../../schemas/data-store.schema';

export class DeleteDataStoreColumnDto extends Z.class({
	id: dataStoreIdSchema,
	columnName: dataStoreColumnNameSchema,
}) {}
