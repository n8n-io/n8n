import { Z } from 'zod-class';

import { dataTableCreateColumnSchema } from '../../schemas/data-table.schema';

export class AddDataTableColumnDto extends Z.class(dataTableCreateColumnSchema.shape) {}
