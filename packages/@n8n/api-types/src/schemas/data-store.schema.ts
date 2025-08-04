import type { DataStoreRows } from 'n8n-workflow/src/data-store.types';
import { z } from 'zod';

import type {
	AddDataStoreColumnDto,
	CreateDataStoreDto,
	DataStoreColumnResultDto,
	DataStoreResultDto,
	DeleteDataStoreColumnDto,
	ListDataStoreContentQueryDto,
	ListDataStoreQueryDto,
	MoveDataStoreColumnDto,
	UpdateDataStoreDto,
} from '../dto';

export const dataStoreNameSchema = z.string().trim().min(1).max(128);
export const dataStoreIdSchema = z.string().max(36);

export const DATA_STORE_COLUMN_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9-]*$/;

export const dataStoreColumnNameSchema = z
	.string()
	.trim()
	.min(1)
	.max(128)
	.regex(
		/^[a-zA-Z0-9][a-zA-Z0-9-]*$/,
		'Only alphanumeric characters and non-leading dashes are allowed for column names',
	);
export const dataStoreColumnTypeSchema = z.enum(['string', 'number', 'boolean', 'date']);

export const dataStoreCreateColumnSchema = z.object({
	name: dataStoreColumnNameSchema,
	type: dataStoreColumnTypeSchema,
	columnIndex: z.number().optional(),
});
export type DataStoreCreateColumnSchema = z.infer<typeof dataStoreCreateColumnSchema>;

export const dataStoreColumnSchema = dataStoreCreateColumnSchema.extend({
	dataStoreId: dataStoreIdSchema,
});

export const dataStoreSchema = z.object({
	id: dataStoreIdSchema,
	name: dataStoreNameSchema,
	columns: z.array(dataStoreColumnSchema),
	createdAt: z.date(),
	updatedAt: z.date(),
});
export type DataStore = z.infer<typeof dataStoreSchema>;
export type DataStoreColumn = z.infer<typeof dataStoreColumnSchema>;

export type DataStoreUserTableName = `data_store_user_${string}`;

export type DataStoreListFilter = {
	id?: string | string[];
	projectId?: string | string[];
	name?: string;
};

export type DataStoreListOptions = Partial<ListDataStoreQueryDto> & {
	filter: { projectId: string };
};

export interface IDataStoreService {
	createDataStore(projectId: string, dto: CreateDataStoreDto): Promise<DataStoreResultDto>;
	updateDataStore(dataStoreId: string, dto: UpdateDataStoreDto): Promise<boolean>;
	getManyAndCount(
		options: DataStoreListOptions,
	): Promise<{ count: number; data: DataStoreResultDto[] }>;

	deleteDataStoreByProjectId(projectId: string): Promise<boolean>;
	deleteDataStoreAll(): Promise<boolean>;
	deleteDataStore(dataStoreId: string): Promise<boolean>;

	getColumns(dataStoreId: string): Promise<DataStoreColumnResultDto[]>;
	addColumn(dataStoreId: string, dto: AddDataStoreColumnDto): Promise<DataStoreColumnResultDto>;
	moveColumn(dataStoreId: string, columnId: string, dto: MoveDataStoreColumnDto): Promise<boolean>;
	deleteColumn(dataStoreId: string, dto: DeleteDataStoreColumnDto): Promise<boolean>;

	getManyRowsAndCount(
		dataStoreId: string,
		dto: Partial<ListDataStoreContentQueryDto>,
	): Promise<{ count: number; data: DataStoreRows[] }>;
	insertRows(dataStoreId: string, rows: DataStoreRows): Promise<boolean>;
}
