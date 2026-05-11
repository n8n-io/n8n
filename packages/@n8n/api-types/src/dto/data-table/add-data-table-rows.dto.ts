import { z } from 'zod';

import {
	dataTableColumnNameSchema,
	dataTableColumnValueSchema,
	insertRowReturnType,
} from '../../schemas/data-table.schema';
import { Z } from '../../zod-class';

export class AddDataTableRowsDto extends Z.class({
	data: z.array(z.record(dataTableColumnNameSchema, dataTableColumnValueSchema)),
	returnType: insertRowReturnType.optional().default('count'),
}) {}
