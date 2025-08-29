import type { Project } from '@/types/projects.types';
import type { DataStoreColumnJsType, DataStore as DS, DataStoreColumn as DSC } from 'n8n-workflow';

export type DataStore = DS & {
	project?: Project;
};

export type DataStoreColumnType = 'string' | 'number' | 'boolean' | 'date';

export type AGGridCellType = 'text' | 'number' | 'boolean' | 'date' | 'dateString' | 'object';

export type DataStoreColumn = Exclude<DSC, 'dataTableId'>;

export type DataStoreColumnCreatePayload = Pick<DataStoreColumn, 'name' | 'type'>;

export type DataStoreValue = DataStoreColumnJsType;

export type DataStoreRow = Record<string, DataStoreValue>;
