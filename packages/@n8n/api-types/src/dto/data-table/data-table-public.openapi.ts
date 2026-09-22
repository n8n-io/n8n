import type { ZodOpenAPIMetadata } from '@asteasolutions/zod-to-openapi';

import { dataTableColumnTypeSchema } from '../../schemas/data-table.schema';

export const dataTableFieldDocs = {
	id: { description: 'Unique identifier for the data table' },
	name: { description: 'Name of the data table' },
	columns: { description: 'Column definitions' },
	projectId: { description: 'ID of the project this table belongs to' },
	createdAt: { description: 'Timestamp when the table was created' },
	updatedAt: { description: 'Timestamp when the table was last updated' },
	sizeBytes: {
		type: 'integer',
		description:
			'Physical storage in bytes, including indexes and internal overhead. Not reduced ' +
			'immediately by row deletion, and may be a few seconds stale.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const dataTableColumnFieldDocs = {
	id: { description: 'Column ID' },
	name: { description: 'Column name' },
	type: { enum: [...dataTableColumnTypeSchema.options], description: 'Column data type' },
	index: { type: 'integer', description: 'Column position' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const dataTableListFieldDocs = {
	nextCursor: {
		description:
			'Paginate through data tables by setting the cursor parameter to a nextCursor attribute ' +
			'returned by a previous request. Default value fetches the first "page" of the collection.',
		example: 'MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDA',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const createDataTableFieldDocs = {
	name: { description: 'Name of the data table', example: 'customers' },
	columns: { description: 'Column definitions for the table' },
	projectId: {
		description:
			"ID of the project to create the table in. When omitted, the table is created in the user's personal project.",
		example: 'a1b2c3d4',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const updateDataTableFieldDocs = {
	name: { description: 'New name for the data table', example: 'updated-customers' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const listDataTablesQueryDocs = {
	filter: {
		type: 'string',
		format: 'jsonString',
		param: {
			description: 'JSON string of filter conditions',
			example: '{"name":"my-table"}',
		},
	},
	sortBy: {
		param: {
			description: 'Sort format: field:asc or field:desc',
			example: 'name:asc',
		},
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const dataTableRowFieldDocs = {
	id: { description: 'The row ID (auto-generated)' },
	createdAt: { description: 'The date and time the row was created' },
	updatedAt: { description: 'The date and time the row was last updated' },
	dryRunState: {
		description:
			'Present only in a dry-run response. Marks whether the row is the state before or ' +
			'after the operation.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const dataTableRowListFieldDocs = {
	nextCursor: {
		description:
			'Paginate through rows by setting the cursor parameter to a nextCursor attribute ' +
			'returned by a previous request. Default value fetches the first "page" of the collection.',
		example: 'MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDA',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const dataTableRowsQueryDocs = {
	filter: {
		type: 'string',
		format: 'jsonString',
		param: {
			description: 'JSON string of filter conditions',
			example:
				'{"type":"and","filters":[{"columnName":"status","condition":"eq","value":"active"}]}',
		},
	},
	sortBy: {
		param: {
			description: 'Sort format: columnName:asc or columnName:desc',
			example: 'createdAt:desc',
		},
	},
	search: {
		param: { description: 'Search text across all string columns' },
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const insertDataTableRowsFieldDocs = {
	data: {
		description: 'Array of rows to insert. Each row is an object with column names as keys.',
	},
	returnType: {
		description:
			'count: return only the number of rows inserted. id: return an array of inserted row ' +
			'IDs. all: return the full row data for all inserted rows.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const updateDataTableRowsFieldDocs = {
	filter: { description: 'Filter conditions to match rows for update' },
	data: { description: 'Column values to update' },
	returnData: { description: 'If true, return the updated rows; if false, return true on success' },
	dryRun: { description: 'If true, preview changes without persisting them' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const upsertDataTableRowFieldDocs = {
	filter: {
		description:
			'Filter conditions to match existing row. If no row matches, a new row is inserted.',
	},
	data: { description: 'Column values for the row' },
	returnData: { description: 'If true, return the upserted row; if false, return true on success' },
	dryRun: { description: 'If true, preview changes without persisting them' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const deleteDataTableRowsQueryDocs = {
	filter: {
		type: 'string',
		format: 'jsonString',
		param: {
			description:
				'JSON string of filter conditions. Required to prevent accidental deletion of all data.',
			example:
				'{"type":"and","filters":[{"columnName":"status","condition":"eq","value":"archived"}]}',
		},
	},
	returnData: {
		param: { description: 'If true, return the deleted rows; if false, return true on success' },
	},
	dryRun: {
		param: {
			description: 'If true, preview which rows would be deleted without actually deleting them',
		},
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const clearDataTableRowsFieldDocs = {
	deletedCount: { type: 'integer', description: 'The number of rows that were deleted' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;
