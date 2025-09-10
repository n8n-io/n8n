import { z } from 'zod';
import { Z } from 'zod-class';

import { dataTableFilterSchema } from '../../schemas/data-table-filter.schema';

const deleteDataTableRowsShape = {
	filter: dataTableFilterSchema.optional(),
	returnData: z.boolean().optional().default(false),
};

export class DeleteDataTableRowsDto extends Z.class(deleteDataTableRowsShape) {}
