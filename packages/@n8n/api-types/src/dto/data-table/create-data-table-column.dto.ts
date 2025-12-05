import { Z } from 'zod-class';

import {
	dataTableColumnNameSchema,
	dataTableColumnTypeSchema,
} from '../../schemas/data-table.schema';

export class CreateDataTableColumnDto extends Z.class({
	name: dataTableColumnNameSchema,
	type: dataTableColumnTypeSchema,
}) {}
