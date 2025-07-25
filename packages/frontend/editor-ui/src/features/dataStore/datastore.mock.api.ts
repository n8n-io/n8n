// import { makeRestApiRequest } from '@n8n/rest-api-client';
import type { IRestApiContext } from '@n8n/rest-api-client';

import { type DataStoreEntity } from '@/features/dataStore/datastore.types';

/**
 * FOR TESTING PURPOSES ONLY
 * This file simulates the API for NWBl77TREaNzOhJ2.
 * It should be replaced with actual API calls once back-end is merged.
 */
export const MOCKED_DATASTORES: DataStoreEntity[] = [
	{
		id: '1',
		name: 'Users',
		size: 1024,
		recordCount: 96,
		columnCount: 8,
		createdAt: '2025-07-07T00:00:00Z',
		updatedAt: '2025-07-17T00:00:00Z',
		projectId: '4KJl0T0erg4DwK70',
	},
	{
		id: '2',
		name: 'Assistant Evaluation',
		size: 2048,
		recordCount: 245,
		columnCount: 17,
		createdAt: '2023-01-01T00:00:00Z',
		updatedAt: '2025-07-07T00:00:00Z',
		projectId: 'NWBl77TREaNzOhJ2',
	},
	{
		id: '3',
		name: 'Product Catalog',
		size: 4096,
		recordCount: 512,
		columnCount: 12,
		createdAt: '2024-03-15T00:00:00Z',
		updatedAt: '2025-07-20T00:00:00Z',
		projectId: 'NWBl77TREaNzOhJ2',
	},
	{
		id: '4',
		name: 'Customer Orders',
		size: 8192,
		recordCount: 1024,
		columnCount: 15,
		createdAt: '2024-01-10T00:00:00Z',
		updatedAt: '2025-07-22T00:00:00Z',
		projectId: 'NWBl77TREaNzOhJ2',
	},
	{
		id: '5',
		name: 'Analytics Events',
		size: 16384,
		recordCount: 2048,
		columnCount: 20,
		createdAt: '2024-02-20T00:00:00Z',
		updatedAt: '2025-07-24T00:00:00Z',
		projectId: 'NWBl77TREaNzOhJ2',
	},
	{
		id: '6',
		name: 'User Preferences',
		size: 512,
		recordCount: 128,
		columnCount: 6,
		createdAt: '2024-05-01T00:00:00Z',
		updatedAt: '2025-07-18T00:00:00Z',
		projectId: 'NWBl77TREaNzOhJ2',
	},
	{
		id: '7',
		name: 'Inventory Tracking',
		size: 3072,
		recordCount: 384,
		columnCount: 10,
		createdAt: '2024-04-12T00:00:00Z',
		updatedAt: '2025-07-21T00:00:00Z',
		projectId: 'NWBl77TREaNzOhJ2',
	},
	{
		id: '8',
		name: 'Support Tickets',
		size: 1536,
		recordCount: 192,
		columnCount: 14,
		createdAt: '2024-06-05T00:00:00Z',
		updatedAt: '2025-07-23T00:00:00Z',
		projectId: 'NWBl77TREaNzOhJ2',
	},
	{
		id: '9',
		name: 'Marketing Campaigns',
		size: 2560,
		recordCount: 320,
		columnCount: 11,
		createdAt: '2024-03-08T00:00:00Z',
		updatedAt: '2025-07-19T00:00:00Z',
		projectId: 'NWBl77TREaNzOhJ2',
	},
	{
		id: '10',
		name: 'Financial Transactions',
		size: 12288,
		recordCount: 1536,
		columnCount: 18,
		createdAt: '2024-01-15T00:00:00Z',
		updatedAt: '2025-07-24T00:00:00Z',
		projectId: 'NWBl77TREaNzOhJ2',
	},
	{
		id: '11',
		name: 'Employee Directory',
		size: 768,
		recordCount: 96,
		columnCount: 9,
		createdAt: '2024-07-01T00:00:00Z',
		updatedAt: '2025-07-22T00:00:00Z',
		projectId: 'NWBl77TREaNzOhJ2',
	},
	{
		id: '12',
		name: 'Project Milestones',
		size: 1280,
		recordCount: 160,
		columnCount: 7,
		createdAt: '2024-02-28T00:00:00Z',
		updatedAt: '2025-07-20T00:00:00Z',
		projectId: 'NWBl77TREaNzOhJ2',
	},
];

export const fetchDataStores = async (
	context: IRestApiContext,
	projectId?: string,
	options?: {
		page?: number;
		pageSize?: number;
	},
) => {
	await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network delay
	let stores = MOCKED_DATASTORES;
	if (projectId) {
		stores = MOCKED_DATASTORES.filter((store) => store.projectId === projectId);
	}
	if (options?.page && options?.pageSize) {
		const start = (options.page - 1) * options.pageSize;
		const end = start + options.pageSize;
		return {
			count: stores.length,
			data: stores.slice(start, end),
		};
	}
	if (options?.pageSize) {
		return {
			count: stores.length,
			data: stores.slice(0, options.pageSize),
		};
	}
	return { count: MOCKED_DATASTORES.length, data: stores };
};
