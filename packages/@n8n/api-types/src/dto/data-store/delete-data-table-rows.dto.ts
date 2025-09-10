import { Z } from 'zod-class';

import { dataTableFilterSchema } from '../../schemas/data-table-filter.schema';

const deleteDataTableRowsShape = {
	filter: dataTableFilterSchema.optional(),
};

export class DeleteDataTableRowsDto extends Z.class(deleteDataTableRowsShape) {}
