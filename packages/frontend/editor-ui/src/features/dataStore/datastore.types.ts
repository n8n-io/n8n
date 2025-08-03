export type DataStoreEntity = {
	id: string;
	name: string;
	size: number;
	recordCount: number;
	columnCount: number;
	createdAt: string;
	updatedAt: string;
	projectId?: string;
};
