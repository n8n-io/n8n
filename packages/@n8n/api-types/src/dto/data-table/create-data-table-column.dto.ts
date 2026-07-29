import { z } from 'zod';

import {
	dataTableColumnNameSchema,
	dataTableColumnTypeSchema,
} from '../../schemas/data-table.schema';
import { Z } from '../../zod-class';

export class CreateDataTableColumnDto extends Z.class({
	name: dataTableColumnNameSchema,
	type: dataTableColumnTypeSchema,
	csvColumnName: z.string().optional(),
}) {}
