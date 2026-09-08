import { dataTableEnumColorSchema } from '../../schemas/data-table.schema';
import { Z } from '../../zod-class';

export class UpdateDataTableEnumOptionColorDto extends Z.class({
	color: dataTableEnumColorSchema,
}) {}
