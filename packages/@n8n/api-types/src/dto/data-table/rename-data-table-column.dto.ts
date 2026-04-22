import { dataTableColumnNameSchema } from '../../schemas/data-table.schema';
import { Z } from '../../zod-class';

export class RenameDataTableColumnDto extends Z.class({
	name: dataTableColumnNameSchema,
}) {}
