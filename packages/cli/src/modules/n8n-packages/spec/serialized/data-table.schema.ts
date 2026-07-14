import {
	dataTableColumnNameSchema,
	dataTableColumnTypeSchema,
	dataTableIdSchema,
	dataTableNameSchema,
} from '@n8n/api-types';
import { z } from 'zod';

export const serializedDataTableColumnSchema = z
	.object({
		name: dataTableColumnNameSchema,
		type: dataTableColumnTypeSchema,
		index: z.number().int(),
	})
	.strict();

export const serializedDataTableSchema = z
	.object({
		id: dataTableIdSchema.min(1),
		name: dataTableNameSchema,
		columns: z.array(serializedDataTableColumnSchema),
	})
	.strict();

export type SerializedDataTableColumn = z.infer<typeof serializedDataTableColumnSchema>;
export type SerializedDataTable = z.infer<typeof serializedDataTableSchema>;
