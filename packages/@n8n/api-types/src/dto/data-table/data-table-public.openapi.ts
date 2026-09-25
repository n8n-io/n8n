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
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const dataTableListFieldDocs = {
	nextCursor: {
		description:
			'Paginate through data tables by setting the cursor parameter to a nextCursor attribute ' +
			'returned by a previous request. Default value fetches the first "page" of the collection.',
		example: 'MTIzZTQ1NjctZTg5Yi0xMmQzLWE0NTYtNDI2NjE0MTc0MDA',
	},
} as const satisfies Record<string, ZodOpenAPIMetadata>;

export const createDataTableColumnFieldDocs = {
	csvColumnName: {
		description:
			'Name of the CSV column to read the values from. If you do not set it, n8n maps the ' +
			'CSV columns by position.',
		example: 'Email Address',
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
