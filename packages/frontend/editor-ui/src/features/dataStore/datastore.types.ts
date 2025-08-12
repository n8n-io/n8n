import type { Project } from '@/types/projects.types';

export type DataStoreEntity = {
	id: string;
	name: string;
	sizeBytes: number;
	recordCount: number;
	columns: DataStoreColumnEntity[];
	createdAt: string;
	updatedAt: string;
	projectId?: string;
	project?: Project;
};

export type DataStoreColumnEntity = {
	id: string;
	name: string;
	type: string;
	index: number;
};
