import { dataTableCreateColumnSchema } from '../../schemas/data-table.schema';
import { Z } from '../../zod-class';

export class AddDataTableColumnDto extends Z.class(dataTableCreateColumnSchema.shape) {}
