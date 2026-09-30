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
	createdAt: { description: 'Timestamp when the column was created' },
	updatedAt: { description: 'Timestamp when the column was last updated' },
	dataTableId: { description: 'ID of the data table this column belongs to' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const dataTableListFieldDocs = {
	nextCursor: {
		description:
			'Paginate through data tables by setting the cursor parameter to a nextCursor attribute ' +
			'returned by a previous request. Default value fetches the first "page" of the collection.',
		example: 'MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDA',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

const dataTableColumnNameDescription =
	'Column name. Must start with a letter; only letters, digits, and underscores after that; ' +
	'maximum 63 characters.';

export const createDataTableColumnFieldDocs = {
	csvColumnName: {
		description:
			'Name of the CSV column to read the values from. If you do not set it, n8n maps the ' +
			'CSV columns by position.',
		example: 'Email Address',
	},
	name: { description: dataTableColumnNameDescription },
	type: { description: 'Column data type' },
	index: { description: 'Column position (optional, appended to end if omitted)' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const updateDataTableColumnFieldDocs = {
	name: { description: dataTableColumnNameDescription },
	index: { description: 'New zero-based position for the column' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const createDataTableFieldDocs = {
	name: { description: 'Name of the data table', example: 'customers' },
	columns: { description: 'Column definitions for the table' },
	projectId: {
		description:
			"ID of the project to create the table in. When omitted, the table is created in the user's personal project.",
		example: 'a1b2c3d4',
	},
	fileId: {
		description:
			'ID of a CSV file that you uploaded in the n8n editor. If you set it, n8n fills the new ' +
			'table with the rows from that file. Only a session-authenticated caller can upload a ' +
			'file, so an API-key caller cannot use this field.',
	},
	hasHeaders: {
		description:
			'Set to true if the first row of the CSV file holds the column names. Applies only when ' +
			'you set `fileId`. The default is true.',
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
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const dataTableRowListFieldDocs = {
	nextCursor: {
		description:
			'Paginate through rows by setting the cursor parameter to a nextCursor attribute ' +
			'returned by a previous request. Default value fetches the first "page" of the collection.',
		example: 'MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDA',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const listDataTableRowsQueryDocs = {
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

export const createDataTableRowsFieldDocs = {
	data: {
		description: 'Array of rows to insert. Each row is an object with column names as keys.',
	},
	returnType: {
		description:
			'count: return only the number of rows inserted. ' +
			'id: return an array of objects with the id of each inserted row. ' +
			'all: return the full row data for all inserted rows.',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const upsertDataTableRowFieldDocs = {
	filter: {
		description:
			'Filter conditions to match an existing row. If no row matches, n8n inserts a new row.',
	},
	data: { description: 'Column values for the row' },
	returnData: {
		description:
			'Set to true to return the upserted row(s) matched by the filter. Set to false to return ' +
			'true on success.',
	},
	dryRun: { description: 'Set to true to preview the change without saving it.' },
} as const satisfies Record<string, ZodOpenAPIMetadata>;
