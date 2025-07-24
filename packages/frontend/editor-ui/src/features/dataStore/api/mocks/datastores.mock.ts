import { type DataStoreEntity } from '@/features/dataStore/datastore.types';

export const MOCKED_DATASTORES: DataStoreEntity[] = [
	{
		id: '1',
		name: 'Users',
		size: 1024,
		recordCount: 96,
		columnCount: 8,
		createdAt: '2025-07-07T00:00:00Z',
		updatedAt: '2025-07-17T00:00:00Z',
		// For now using names as project IDs,
		projectId: 'Personal',
	},
	{
		id: '2',
		name: 'Assistant Evaluation',
		size: 2048,
		recordCount: 245,
		columnCount: 17,
		createdAt: '2023-01-01T00:00:00Z',
		updatedAt: '2025-07-07T00:00:00Z',
		projectId: 'Data Stores',
	},
];
