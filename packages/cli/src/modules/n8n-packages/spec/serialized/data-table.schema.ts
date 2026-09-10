import {
	dataTableColumnNameSchema,
	dataTableColumnTypeSchema,
	dataTableEnumOptionsInputSchema,
	dataTableIdSchema,
	dataTableMetadataSchema,
	dataTableNameSchema,
} from '@n8n/api-types';
import {
	DATA_TABLE_SYSTEM_COLUMNS,
	DATA_TABLE_SYSTEM_TESTING_COLUMN,
	DATA_TABLE_VIRTUAL_COLUMNS,
} from 'n8n-workflow';
import { z } from 'zod';

const reservedColumnNames = new Set(
	[
		...DATA_TABLE_SYSTEM_COLUMNS,
		DATA_TABLE_SYSTEM_TESTING_COLUMN,
		...DATA_TABLE_VIRTUAL_COLUMNS,
	].map((name) => name.toLowerCase()),
);

export const serializedDataTableColumnSchema = z
	.object({
		name: dataTableColumnNameSchema,
		type: dataTableColumnTypeSchema,
		index: z.number().int(),
		options: dataTableEnumOptionsInputSchema.optional(),
		defaultValue: z.string().trim().min(1).max(128).optional(),
	})
	.strict();

// Column names are re-validated here (not only at creation time) so a package
// that could never be created is rejected at parse time, before any writes.
export const serializedDataTableSchema = z
	.object({
		id: dataTableIdSchema.min(1),
		name: dataTableNameSchema,
		columns: z.array(serializedDataTableColumnSchema),
		metadata: dataTableMetadataSchema.optional(),
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
