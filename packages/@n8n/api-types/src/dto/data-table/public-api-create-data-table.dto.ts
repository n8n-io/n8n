import { z } from 'zod';

import { CreateDataTableColumnDto } from './create-data-table-column.dto';
import { dataTableNameSchema } from '../../schemas/data-table.schema';
import { Z } from '../../zod-class';

export class PublicApiCreateDataTableDto extends Z.class({
	name: dataTableNameSchema,
	columns: z.array(CreateDataTableColumnDto.schema).describe('Column definitions for the table'),
	fileId: z.string().optional(),
	hasHeaders: z.boolean().optional(),
	projectId: z
		.string()
		.optional()
		.describe(
			"ID of the project to create the table in. When omitted, the table is created in the user's personal project.",
		),
}) {}
