import { Z } from 'zod-class';

import { dataTableColumnNameSchema } from '../../schemas/data-table.schema';

export class RenameDataTableColumnDto extends Z.class({
	name: dataTableColumnNameSchema,
}) {}
