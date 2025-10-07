import { z } from 'zod';
import { Z } from 'zod-class';

import { CreateDataTableColumnDto } from './create-data-table-column.dto';
import { dataTableNameSchema } from '../../schemas/data-table.schema';

export class CreateDataTableDto extends Z.class({
	name: dataTableNameSchema,
	columns: z.array(CreateDataTableColumnDto),
}) {}
