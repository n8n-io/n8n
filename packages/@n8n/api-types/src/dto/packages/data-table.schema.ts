import { DATA_TABLE_SYSTEM_COLUMNS, DATA_TABLE_SYSTEM_TESTING_COLUMN } from 'n8n-workflow';
import { z } from 'zod';

import {
	dataTableColumnNameSchema,
	dataTableColumnTypeSchema,
	dataTableIdSchema,
	dataTableNameSchema,
} from '../../schemas/data-table.schema';

const reservedColumnNames = new Set(
	[...DATA_TABLE_SYSTEM_COLUMNS, DATA_TABLE_SYSTEM_TESTING_COLUMN].map((name) =>
		name.toLowerCase(),
	),
);

export const serializedDataTableColumnSchema = z
	.object({
		// Optional, because older packages have no column ids. Import then matches columns by name.
		id: dataTableIdSchema.min(1).optional(),
		name: dataTableColumnNameSchema,
		type: dataTableColumnTypeSchema,
		index: z.number().int(),
	})
	.strict();

// Check the column names here too, not only when the table is created. Then
// import rejects a table that it cannot create before it writes anything.
export const serializedDataTableSchema = z
	.object({
		id: dataTableIdSchema.min(1),
		name: dataTableNameSchema,
		columns: z.array(serializedDataTableColumnSchema),
	})
	.strict()
	.superRefine(({ columns }, ctx) => {
		const seen = new Set<string>();
		columns.forEach((column, index) => {
			if (reservedColumnNames.has(column.name.toLowerCase())) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['columns', index, 'name'],
					message: `"${column.name}" is a reserved system column name`,
				});
			}
			if (seen.has(column.name)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ['columns', index, 'name'],
					message: `duplicate column name "${column.name}"`,
				});
			}
			seen.add(column.name);
		});
	});

export type SerializedDataTableColumn = z.infer<typeof serializedDataTableColumnSchema>;
export type SerializedDataTable = z.infer<typeof serializedDataTableSchema>;
