import { z } from 'zod';
import { Z } from 'zod-class';

import {
	dataTableColumnNameSchema,
	dataTableColumnValueSchema,
	insertRowReturnType,
} from '../../schemas/data-table.schema';

export class AddDataTableRowsDto extends Z.class({
	data: z.array(z.record(dataTableColumnNameSchema, dataTableColumnValueSchema)),
	returnType: insertRowReturnType,
}) {}
