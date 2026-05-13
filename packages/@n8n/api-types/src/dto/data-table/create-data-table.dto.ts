import { z } from 'zod';

import { CreateDataTableColumnDto } from './create-data-table-column.dto';
import { dataTableKindSchema, dataTableNameSchema } from '../../schemas/data-table.schema';
import { Z } from '../../zod-class';

const createDataTableMetadataSchema = z.object({
	allowedStatuses: z.array(z.string()).optional(),
});

export class CreateDataTableDto extends Z.class({
	name: dataTableNameSchema,
	columns: z.array(CreateDataTableColumnDto.schema),
	fileId: z.string().optional(),
	hasHeaders: z.boolean().optional(),
	kind: dataTableKindSchema.optional(),
	metadata: createDataTableMetadataSchema.optional(),
}) {}
