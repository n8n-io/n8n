import type { Project } from '@/types/projects.types';

export type DataStore = {
	id: string;
	name: string;
	sizeBytes: number;
	recordCount: number;
	columns: DataStoreColumn[];
	createdAt: string;
	updatedAt: string;
	projectId?: string;
	project?: Project;
};

export type DataStoreColumn = {
	id: string;
	name: string;
	type: string;
	index: number;
};
