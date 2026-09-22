import '../../openapi-extend';

import { z } from 'zod';

import {
	createDataTableColumnFieldDocs,
	createDataTableFieldDocs,
	dataTableColumnFieldDocs,
	dataTableFieldDocs,
	dataTableListFieldDocs,
	updateDataTableColumnFieldDocs,
	updateDataTableFieldDocs,
} from './data-table-public.openapi';
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

const dataTableColumnFullPublicSchema = dataTableColumnPublicSchema.extend({
	dataTableId: z.string().openapi(dataTableColumnFieldDocs.dataTableId),
});

export class DataTableColumnPublicDto extends Z.class(dataTableColumnFullPublicSchema.shape) {}

export class DataTableColumnListPublicDto extends Z.array(dataTableColumnFullPublicSchema) {}

export class CreateDataTableColumnPublicDto extends Z.class({
	name: dataTableColumnNameSchema.openapi(createDataTableColumnFieldDocs.name),
	type: dataTableColumnTypeSchema.openapi(createDataTableColumnFieldDocs.type),
	index: z.number().int().min(0).openapi(createDataTableColumnFieldDocs.index).optional(),
}) {}

// Legacy `updateColumnRequest.yml` requires at least one of `name`/`index` (an `anyOf`), which a
// `Z.class` shape can't express. The controller rejects an empty body at runtime instead.
export class UpdateDataTableColumnPublicDto extends Z.class(
	{
		name: dataTableColumnNameSchema.openapi(updateDataTableColumnFieldDocs.name).optional(),
		index: z.number().int().min(0).openapi(updateDataTableColumnFieldDocs.index).optional(),
	},
	{ strict: true },
) {}
