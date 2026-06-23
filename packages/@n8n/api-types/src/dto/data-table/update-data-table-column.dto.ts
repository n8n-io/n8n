import { z } from 'zod';

import { dataTableColumnNameSchema } from '../../schemas/data-table.schema';

const updateDataTableColumnIndexSchema = z.number().int().nonnegative();

export const updateDataTableColumnSchema = z.union([
	z.object({
		name: dataTableColumnNameSchema,
		index: updateDataTableColumnIndexSchema.optional(),
	}),
	z.object({
		name: dataTableColumnNameSchema.optional(),
		index: updateDataTableColumnIndexSchema,
	}),
]);

export type UpdateDataTableColumnDto = z.infer<typeof updateDataTableColumnSchema>;
