import { z } from 'zod';

import {
	dataTableColumnNameSchema,
	dataTableColumnTypeSchema,
	dataTableEnumOptionsInputSchema,
} from '../../schemas/data-table.schema';
import { Z } from '../../zod-class';

export class CreateDataTableColumnDto extends Z.class({
	name: dataTableColumnNameSchema,
	type: dataTableColumnTypeSchema,
	options: dataTableEnumOptionsInputSchema.optional(),
	defaultValue: z.string().trim().min(1).max(128).optional(),
	csvColumnName: z.string().optional(),
}) {}
