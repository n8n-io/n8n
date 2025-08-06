import type { ProjectSharingData } from 'n8n-workflow';

export type DataStoreEntity = {
	id: string;
	name: string;
	sizeBytes: number;
	recordCount: number;
	columns: DataStoreColumnEntity[];
	createdAt: string;
	updatedAt: string;
	projectId?: string;
	project?: ProjectSharingData;
};

export type DataStoreColumnEntity = {
	id: string;
	name: string;
	type: string;
	index: number;
};
