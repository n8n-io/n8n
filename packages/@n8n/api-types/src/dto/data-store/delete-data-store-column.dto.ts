import { Z } from 'zod-class';

import { dataStoreColumnNameSchema } from '../../schemas/data-store.schema';

export class DeleteDataStoreColumnDto extends Z.class({
	columnName: dataStoreColumnNameSchema,
}) {}
