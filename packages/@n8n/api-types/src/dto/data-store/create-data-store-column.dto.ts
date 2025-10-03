import { Z } from 'zod-class';

import {
	dataStoreColumnNameSchema,
	dataStoreColumnTypeSchema,
} from '../../schemas/data-store.schema';

export class CreateDataStoreColumnDto extends Z.class({
	name: dataStoreColumnNameSchema,
	type: dataStoreColumnTypeSchema,
}) {}
