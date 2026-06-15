import { dataTableNameSchema } from '../../schemas/data-table.schema';
import { Z } from '../../zod-class';

export class UpdateDataTableDto extends Z.class({
	name: dataTableNameSchema,
}) {}
