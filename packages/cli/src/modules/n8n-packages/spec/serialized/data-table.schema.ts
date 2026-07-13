import { dataTableColumnTypeSchema } from '@n8n/api-types';
import { z } from 'zod';

export const serializedDataTableColumnSchema = z
	.object({
		name: z.string().min(1),
		type: dataTableColumnTypeSchema,
		index: z.number().int(),
	})
	.strict();

export const serializedDataTableSchema = z
	.object({
		id: z.string().min(1),
		name: z.string().min(1),
		columns: z.array(serializedDataTableColumnSchema),
	})
	.strict();

export type SerializedDataTableColumn = z.infer<typeof serializedDataTableColumnSchema>;
export type SerializedDataTable = z.infer<typeof serializedDataTableSchema>;
