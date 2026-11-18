import { dataTableRowRuleSchema } from '../../schemas/data-table.schema';
import { Z } from '../../zod-class';

export class SetDataTableRowRuleDto extends Z.class({
	rowRule: dataTableRowRuleSchema.nullable(),
}) {}
