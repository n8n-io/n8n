import '../../openapi-extend';

import { z } from 'zod';

import {
	createDataTableFieldDocs,
	dataTableColumnFieldDocs,
	dataTableFieldDocs,
	dataTableListFieldDocs,
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
