import '../../openapi-extend';

import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import {
	clearDataTableRowsFieldDocs,
	createDataTableColumnFieldDocs,
	createDataTableFieldDocs,
	createDataTableRowsFieldDocs,
	dataTableColumnFieldDocs,
	dataTableFieldDocs,
	dataTableListFieldDocs,
	dataTableRowFieldDocs,
	dataTableRowListFieldDocs,
	deleteDataTableRowsQueryDocs,
	updateDataTableColumnFieldDocs,
	updateDataTableFieldDocs,
	updateDataTableRowFieldDocs,
	upsertDataTableRowFieldDocs,
} from './data-table-public.openapi';
import { booleanFromString } from '../../schemas/boolean-from-string';
import {
	dataTableFilterRecordSchema,
	dataTableFilterSchema,
	dataTableFilterTypeSchema,
} from '../../schemas/data-table-filter.schema';
import {
	dataTableColumnNameSchema,
	dataTableColumnTypeSchema,
	dataTableColumnValueSchema,
	dataTableNameSchema,
	insertRowReturnType,
} from '../../schemas/data-table.schema';
import { Z } from '../../zod-class';

const dataTableColumnPublicSchema = z.object({
	id: z.string().openapi(dataTableColumnFieldDocs.id),
	name: z.string().openapi(dataTableColumnFieldDocs.name),
	type: z.string().openapi(dataTableColumnFieldDocs.type),
	index: z.number().openapi(dataTableColumnFieldDocs.index),
	createdAt: z.string().datetime().openapi(dataTableColumnFieldDocs.createdAt),
	updatedAt: z.string().datetime().openapi(dataTableColumnFieldDocs.updatedAt),
});

export const dataTablePublicSchema = z.object({
	id: z.string().openapi(dataTableFieldDocs.id),
	name: z.string().openapi(dataTableFieldDocs.name),
	columns: z.array(dataTableColumnPublicSchema).openapi(dataTableFieldDocs.columns),
	projectId: z.string().openapi(dataTableFieldDocs.projectId),
	createdAt: z.string().datetime().openapi(dataTableFieldDocs.createdAt),
	updatedAt: z.string().datetime().openapi(dataTableFieldDocs.updatedAt),
	sizeBytes: z.number().openapi(dataTableFieldDocs.sizeBytes),
});

export type DataTablePublic = z.infer<typeof dataTablePublicSchema>;

export class DataTablePublicDto extends Z.class(dataTablePublicSchema.shape) {}

export class DataTableListPublicDto extends Z.class({
	data: z.array(dataTablePublicSchema),
	nextCursor: z.string().nullable().openapi(dataTableListFieldDocs.nextCursor),
}) {}

const createDataTableColumnPublicSchema = z.object({
	name: dataTableColumnNameSchema.openapi(dataTableColumnFieldDocs.name),
	type: dataTableColumnTypeSchema.openapi(dataTableColumnFieldDocs.type),
	csvColumnName: z.string().optional().openapi(createDataTableColumnFieldDocs.csvColumnName),
});

export class CreateDataTablePublicDto extends Z.class({
	name: dataTableNameSchema.openapi(createDataTableFieldDocs.name),
	columns: z.array(createDataTableColumnPublicSchema).openapi(createDataTableFieldDocs.columns),
	projectId: z.string().optional().openapi(createDataTableFieldDocs.projectId),
	fileId: z.string().optional().openapi(createDataTableFieldDocs.fileId),
	hasHeaders: z.boolean().optional().openapi(createDataTableFieldDocs.hasHeaders),
}) {}

export class UpdateDataTablePublicDto extends Z.class({
	name: dataTableNameSchema.openapi(updateDataTableFieldDocs.name),
}) {}

const dataTableListColumnPublicSchema = dataTableColumnPublicSchema.extend({
	dataTableId: z.string().openapi(dataTableColumnFieldDocs.dataTableId),
});

export class DataTableColumnPublicDto extends Z.class(dataTableListColumnPublicSchema.shape) {}

export class DataTableColumnListPublicDto extends Z.array(dataTableListColumnPublicSchema) {}

export class CreateDataTableColumnPublicDto extends Z.class({
	name: dataTableColumnNameSchema.openapi(createDataTableColumnFieldDocs.name),
	type: dataTableColumnTypeSchema.openapi(createDataTableColumnFieldDocs.type),
	index: z.number().int().min(0).openapi(createDataTableColumnFieldDocs.index).optional(),
}) {}

// Legacy `updateColumnRequest.yml` requires at least one of `name`/`index`.
const updateDataTableColumnPublicSchema = z
	.object({
		name: dataTableColumnNameSchema.openapi(updateDataTableColumnFieldDocs.name).optional(),
		index: z.number().int().min(0).openapi(updateDataTableColumnFieldDocs.index).optional(),
	})
	.strict()
	.refine(({ name, index }) => name !== undefined || index !== undefined, {
		message: 'At least one field is required',
	})
	.openapi({ minProperties: 1 });

type UpdateDataTableColumnPublic = z.infer<typeof updateDataTableColumnPublicSchema>;

export class UpdateDataTableColumnPublicDto implements UpdateDataTableColumnPublic {
	name?: string;

	index?: number;

	static schema = updateDataTableColumnPublicSchema;

	constructor(data: UpdateDataTableColumnPublic) {
		Object.assign(this, updateDataTableColumnPublicSchema.parse(data));
	}

	static safeParse(data: unknown) {
		return updateDataTableColumnPublicSchema.safeParse(data);
	}

	static parse(data: unknown) {
		return updateDataTableColumnPublicSchema.parse(data);
	}
}

export const dataTableRowPublicSchema = z
	.object({
		id: z.number().int().openapi(dataTableRowFieldDocs.id),
		createdAt: z.string().datetime().openapi(dataTableRowFieldDocs.createdAt),
		updatedAt: z.string().datetime().openapi(dataTableRowFieldDocs.updatedAt),
	})
	.passthrough()
	.openapi({
		description:
			'A data table row with system columns (id, createdAt, updatedAt) and user-defined columns',
	});

export class DataTableRowListPublicDto extends Z.class({
	data: z.array(dataTableRowPublicSchema),
	nextCursor: z.string().nullable().openapi(dataTableRowListFieldDocs.nextCursor),
}) {}

export class CreateDataTableRowsPublicDto extends Z.class({
	data: z
		.array(z.record(dataTableColumnNameSchema, dataTableColumnValueSchema))
		.min(1)
		.openapi(createDataTableRowsFieldDocs.data),
	returnType: insertRowReturnType
		.optional()
		.default('count')
		.openapi(createDataTableRowsFieldDocs.returnType),
}) {}

const insertDataTableRowsResponseSchema = z.union([
	z
		.object({ success: z.literal(true), insertedRows: z.number().int() })
		.openapi({ description: "Returned when returnType is 'count'" }),
	z
		.array(z.object({ id: z.number().int() }).strict())
		.openapi({ description: "Returned when returnType is 'id'" }),
	z.array(dataTableRowPublicSchema).openapi({ description: "Returned when returnType is 'all'" }),
]);

export class InsertDataTableRowsResponsePublicDto {
	static schema = insertDataTableRowsResponseSchema;

	static parse(data: unknown) {
		return insertDataTableRowsResponseSchema.parse(data);
	}

	static safeParse(data: unknown) {
		return insertDataTableRowsResponseSchema.safeParse(data);
	}
}

const legacyFilterConditionSchema = z.union([
	z.literal('eq'),
	z.literal('neq'),
	z.literal('like'),
	z.literal('ilike'),
	z.literal('gt'),
	z.literal('gte'),
	z.literal('lt'),
	z.literal('lte'),
]);

const publicUpsertUpdateFilterSchema = z.object({
	type: dataTableFilterTypeSchema.default('and'),
	filters: z
		.array(dataTableFilterRecordSchema.extend({ condition: legacyFilterConditionSchema }))
		.min(1, 'filter must not be empty'),
});

export class UpsertDataTableRowPublicDto extends Z.class({
	filter: publicUpsertUpdateFilterSchema.openapi(upsertDataTableRowFieldDocs.filter),
	data: z
		.record(dataTableColumnNameSchema, dataTableColumnValueSchema)
		.refine((obj) => Object.keys(obj).length > 0, { message: 'data must not be empty' })
		.openapi(upsertDataTableRowFieldDocs.data),
	returnData: z.boolean().optional().default(false).openapi(upsertDataTableRowFieldDocs.returnData),
	dryRun: z.boolean().optional().default(false).openapi(upsertDataTableRowFieldDocs.dryRun),
}) {}

const dataTableRowWithStatePublicSchema = z
	.object({
		id: z.number().int().nullable().openapi(dataTableRowFieldDocs.id),
		createdAt: z.string().datetime().nullable().openapi(dataTableRowFieldDocs.createdAt),
		updatedAt: z.string().datetime().nullable().openapi(dataTableRowFieldDocs.updatedAt),
		dryRunState: z.enum(['before', 'after']).openapi({
			description: 'Whether this entry shows the row state before or after the change',
		}),
	})
	.passthrough();

const upsertDataTableRowResponseSchema = z.union([
	z.boolean().openapi({ description: 'Returned when returnData is false and dryRun is false' }),
	z.array(dataTableRowWithStatePublicSchema).openapi({
		description: 'Returned when dryRun is true: one entry per row per before/after state',
	}),
	z
		.array(dataTableRowPublicSchema)
		.openapi({ description: 'Returned when returnData is true and dryRun is false' }),
]);

export class UpsertDataTableRowResponsePublicDto {
	static schema = upsertDataTableRowResponseSchema;

	static parse(data: unknown) {
		return upsertDataTableRowResponseSchema.parse(data);
	}

	static safeParse(data: unknown) {
		return upsertDataTableRowResponseSchema.safeParse(data);
	}
}

export class UpdateDataTableRowPublicDto extends Z.class({
	filter: publicUpsertUpdateFilterSchema.openapi(updateDataTableRowFieldDocs.filter),
	data: z
		.record(dataTableColumnNameSchema, dataTableColumnValueSchema)
		.refine((obj) => Object.keys(obj).length > 0, { message: 'data must not be empty' })
		.openapi(updateDataTableRowFieldDocs.data),
	returnData: z.boolean().optional().default(false).openapi(updateDataTableRowFieldDocs.returnData),
	dryRun: z.boolean().optional().default(false).openapi(updateDataTableRowFieldDocs.dryRun),
}) {}

const updateDataTableRowResponseSchema = z.union([
	z.boolean().openapi({ description: 'Returned when returnData is false and dryRun is false' }),
	z.array(dataTableRowWithStatePublicSchema).openapi({
		description: 'Returned when dryRun is true: one entry per row per before/after state',
	}),
	z
		.array(dataTableRowPublicSchema)
		.openapi({ description: 'Returned when returnData is true and dryRun is false' }),
]);

export class UpdateDataTableRowResponsePublicDto {
	static schema = updateDataTableRowResponseSchema;

	static parse(data: unknown) {
		return updateDataTableRowResponseSchema.parse(data);
	}

	static safeParse(data: unknown) {
		return updateDataTableRowResponseSchema.safeParse(data);
	}
}

const publicRowFilterQueryValidator = z.string().transform((val, ctx) => {
	let parsed: unknown;
	try {
		parsed = jsonParse(val);
	} catch {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Invalid filter format',
			path: ['filter'],
		});
		return z.NEVER;
	}

	const result = dataTableFilterSchema.safeParse(parsed);
	if (!result.success) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'Invalid filter fields',
			path: ['filter'],
		});
		return z.NEVER;
	}

	if (result.data.filters.length === 0) {
		ctx.addIssue({
			code: z.ZodIssueCode.custom,
			message: 'At least one filter condition is required for delete operations',
			path: ['filter'],
		});
		return z.NEVER;
	}

	return result.data;
});

export class DeleteDataTableRowsPublicQueryDto extends Z.class({
	filter: publicRowFilterQueryValidator.openapi(deleteDataTableRowsQueryDocs.filter),
	returnData: booleanFromString
		.optional()
		.default('false')
		.openapi(deleteDataTableRowsQueryDocs.returnData),
	dryRun: booleanFromString
		.optional()
		.default('false')
		.openapi(deleteDataTableRowsQueryDocs.dryRun),
}) {}

const deleteDataTableRowsResponseSchema = z.union([
	z.boolean().openapi({ description: 'Returned when returnData is false and dryRun is false' }),
	z.array(dataTableRowWithStatePublicSchema).openapi({
		description: 'Returned when dryRun is true: one entry per row per before/after state',
	}),
	z
		.array(dataTableRowPublicSchema)
		.openapi({ description: 'Returned when returnData is true and dryRun is false' }),
]);

export class DeleteDataTableRowsResponsePublicDto {
	static schema = deleteDataTableRowsResponseSchema;

	static parse(data: unknown) {
		return deleteDataTableRowsResponseSchema.parse(data);
	}

	static safeParse(data: unknown) {
		return deleteDataTableRowsResponseSchema.safeParse(data);
	}
}

export class ClearDataTableRowsResponsePublicDto extends Z.class({
	deletedCount: z.number().int().openapi(clearDataTableRowsFieldDocs.deletedCount),
}) {}
