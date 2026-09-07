import { z } from 'zod';

import {
	dataTableColumnNameSchema,
	dataTableColumnTypeSchema,
	dataTableEnumOptionsSchema,
} from '../../schemas/data-table.schema';
import { Z } from '../../zod-class';

export class CreateDataTableColumnDto extends Z.class({
	name: dataTableColumnNameSchema,
	type: dataTableColumnTypeSchema,
	options: dataTableEnumOptionsSchema.optional(),
	csvColumnName: z.string().optional(),
}) {}
