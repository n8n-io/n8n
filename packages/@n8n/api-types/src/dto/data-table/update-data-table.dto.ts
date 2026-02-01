import { Z } from 'zod-class';

import { dataTableNameSchema } from '../../schemas/data-table.schema';

export class UpdateDataTableDto extends Z.class({
	name: dataTableNameSchema,
}) {}
