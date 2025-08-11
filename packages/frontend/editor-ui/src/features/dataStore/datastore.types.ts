import type { ProjectSharingData } from 'n8n-workflow';

export type DataStore = {
	id: string;
	name: string;
	sizeBytes: number;
	recordCount: number;
	columns: DataStoreColumn[];
	createdAt: string;
	updatedAt: string;
	projectId?: string;
	project?: ProjectSharingData;
};

export type DataStoreColumn = {
	id: string;
	name: string;
	type: string;
	index: number;
};
