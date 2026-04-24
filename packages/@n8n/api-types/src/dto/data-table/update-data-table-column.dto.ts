import { z } from 'zod';

import { dataTableColumnNameSchema } from '../../schemas/data-table.schema';

export const updateDataTableColumnSchema = z
	.object({
		name: dataTableColumnNameSchema.optional(),
		index: z.number().int().nonnegative().optional(),
	})
	.refine(({ name, index }) => name !== undefined || index !== undefined, {
		message: 'At least one of name or index is required',
	});

export type UpdateDataTableColumnDto = z.infer<typeof updateDataTableColumnSchema>;
