import '../../openapi-extend';

import { z } from 'zod';

import { AddDataTableRowsDto } from './add-data-table-rows.dto';
import {
	clearDataTableRowsFieldDocs,
	createDataTableFieldDocs,
	dataTableColumnFieldDocs,
	dataTableFieldDocs,
	dataTableListFieldDocs,
	dataTableRowFieldDocs,
	dataTableRowListFieldDocs,
	deleteDataTableRowsQueryDocs,
	insertDataTableRowsFieldDocs,
	updateDataTableFieldDocs,
	updateDataTableRowsFieldDocs,
	upsertDataTableRowFieldDocs,
} from './data-table-public.openapi';
import { DeleteDataTableRowsDto } from './delete-data-table-rows.dto';
import { UpdateDataTableRowDto } from './update-data-table-row.dto';
import { UpsertDataTableRowDto } from './upsert-data-table-row.dto';
import {
	dataTableColumnNameSchema,
	dataTableColumnTypeSchema,
	dataTableNameSchema,
} from '../../schemas/data-table.schema';
import { Z } from '../../zod-class';

const dataTableColumnPublicSchema = z.object({
	id: z.string().openapi(dataTableColumnFieldDocs.id),
	name: z.string().openapi(dataTableColumnFieldDocs.name),
	type: z.string().openapi(dataTableColumnFieldDocs.type),
	index: z.number().openapi(dataTableColumnFieldDocs.index),
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
});

export class CreateDataTablePublicDto extends Z.class({
	name: dataTableNameSchema.openapi(createDataTableFieldDocs.name),
	columns: z.array(createDataTableColumnPublicSchema).openapi(createDataTableFieldDocs.columns),
	projectId: z.string().optional().openapi(createDataTableFieldDocs.projectId),
}) {}

export class UpdateDataTablePublicDto extends Z.class({
	name: dataTableNameSchema.openapi(updateDataTableFieldDocs.name),
}) {}

/**
 * A row's user-defined columns are not known statically, so this schema must keep unknown keys
 * (`.passthrough()`) instead of stripping them. Stripping would silently delete every user column
 * from the response. `id`/`createdAt`/`updatedAt` are nullable and `dryRunState` is present only
 * for a dry-run response - see `DataTableRowReturnWithState` in `n8n-workflow`.
 *
 * `createdAt`/`updatedAt` arrive from the service as `Date` objects (see `normalizeRows` in
 * `data-table-rows.repository.ts`), not strings - `res.json` would convert them for us, but that
 * never runs because the registry parses the DTO first. Accept `z.date()` and transform it to an
 * ISO string here instead, the same conversion `toDataTablePublicDto` does explicitly for the
 * table-level DTO.
 */
const rowTimestampSchema = z
	.date()
	.nullable()
	.transform((date) => date?.toISOString() ?? null);

export const dataTableRowPublicSchema = z
	.object({
		id: z.number().nullable().openapi(dataTableRowFieldDocs.id),
		createdAt: rowTimestampSchema.openapi({
			type: 'string',
			format: 'date-time',
			...dataTableRowFieldDocs.createdAt,
		}),
		updatedAt: rowTimestampSchema.openapi({
			type: 'string',
			format: 'date-time',
			...dataTableRowFieldDocs.updatedAt,
		}),
		dryRunState: z.enum(['before', 'after']).optional().openapi(dataTableRowFieldDocs.dryRunState),
	})
	.passthrough();

export type DataTableRowPublic = z.infer<typeof dataTableRowPublicSchema>;

export class DataTableRowPublicDto extends Z.class(dataTableRowPublicSchema.shape, {
	passthrough: true,
}) {}

export class DataTableRowListPublicDto extends Z.class({
	data: z.array(dataTableRowPublicSchema),
	nextCursor: z.string().nullable().openapi(dataTableRowListFieldDocs.nextCursor),
}) {}

// POST /rows: the shape depends on `returnType` - see `DataTableInsertRowsResult` in n8n-workflow.
// The `id`-only member must be `.strict()`: a plain (non-strict) `z.object` validates successfully
// against extra keys by silently stripping them, so a full row would otherwise match this member
// first and lose every column except `id` - `z.union` takes the first member that validates.
const dataTableInsertRowsCountResultSchema = z.object({
	success: z.literal(true),
	insertedRows: z.number(),
});
const dataTableInsertRowsIdResultSchema = z.array(z.object({ id: z.number() }).strict());
const dataTableInsertRowsAllResultSchema = z.array(dataTableRowPublicSchema);

export const dataTableInsertRowsResultSchema = z.union([
	dataTableInsertRowsCountResultSchema,
	dataTableInsertRowsIdResultSchema,
	dataTableInsertRowsAllResultSchema,
]);

export const DataTableInsertRowsResultPublicDto = Z.union(
	'DataTableInsertRowsResultPublicDto',
	dataTableInsertRowsResultSchema,
);

// PATCH /rows/update, POST /rows/upsert, DELETE /rows/delete: `true` when `returnData` is false,
// otherwise the affected rows (with `dryRunState` set when `dryRun` is true).
export const dataTableRowsOrTrueSchema = z.union([
	z.literal(true),
	z.array(dataTableRowPublicSchema),
]);

export const DataTableRowsOrTruePublicDto = Z.union(
	'DataTableRowsOrTruePublicDto',
	dataTableRowsOrTrueSchema,
);

export class DataTableClearRowsResultPublicDto extends Z.class({
	deletedCount: z.number().openapi(clearDataTableRowsFieldDocs.deletedCount),
}) {}

// Reuses the shared internal DTOs' field validators (not the DTOs themselves) so the public and
// internal request bodies stay in sync without exposing the internal DTO as the public contract.
export class InsertDataTableRowsPublicDto extends Z.class({
	data: AddDataTableRowsDto.schema.shape.data.min(1).openapi(insertDataTableRowsFieldDocs.data),
	returnType: AddDataTableRowsDto.schema.shape.returnType.openapi(
		insertDataTableRowsFieldDocs.returnType,
	),
}) {}

export class UpdateDataTableRowsPublicDto extends Z.class({
	filter: UpdateDataTableRowDto.schema.shape.filter.openapi(updateDataTableRowsFieldDocs.filter),
	data: UpdateDataTableRowDto.schema.shape.data.openapi(updateDataTableRowsFieldDocs.data),
	returnData: UpdateDataTableRowDto.schema.shape.returnData.openapi(
		updateDataTableRowsFieldDocs.returnData,
	),
	dryRun: UpdateDataTableRowDto.schema.shape.dryRun.openapi(updateDataTableRowsFieldDocs.dryRun),
}) {}

export class UpsertDataTableRowPublicDto extends Z.class({
	filter: UpsertDataTableRowDto.schema.shape.filter.openapi(upsertDataTableRowFieldDocs.filter),
	data: UpsertDataTableRowDto.schema.shape.data.openapi(upsertDataTableRowFieldDocs.data),
	returnData: UpsertDataTableRowDto.schema.shape.returnData.openapi(
		upsertDataTableRowFieldDocs.returnData,
	),
	dryRun: UpsertDataTableRowDto.schema.shape.dryRun.openapi(upsertDataTableRowFieldDocs.dryRun),
}) {}

export class DeleteDataTableRowsPublicQueryDto extends Z.class({
	filter: DeleteDataTableRowsDto.schema.shape.filter.openapi(deleteDataTableRowsQueryDocs.filter),
	returnData: DeleteDataTableRowsDto.schema.shape.returnData.openapi(
		deleteDataTableRowsQueryDocs.returnData,
	),
	dryRun: DeleteDataTableRowsDto.schema.shape.dryRun.openapi(deleteDataTableRowsQueryDocs.dryRun),
}) {}
