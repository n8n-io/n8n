import type { Project } from '@/types/projects.types';
import type { DataStoreColumnJsType, DataStore as DS, DataStoreColumn } from 'n8n-workflow';

export type DataStore = Omit<DS, 'createdAt' | 'updatedAt'> & {
	sizeBytes: number;
	project?: Project;
	createdAt: string;
	updatedAt: string;
};

export type AGGridCellType = 'text' | 'number' | 'boolean' | 'date' | 'dateString' | 'object';

export type DataStoreColumnCreatePayload = Pick<DataStoreColumn, 'name' | 'type'>;

export type DataStoreValue = DataStoreColumnJsType;

export type DataStoreRow = Record<string, DataStoreValue>;
