import type { PromotableResource, PromoteRequest } from '@n8n/api-types';
import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

const MOCK_DATA: PromotableResource[] = [
	{
		id: 'wf-001',
		name: 'Email summary',
		type: 'workflow',
		status: 'modified',
		version: 14,
		updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
		updatedBy: 'user-001',
		dependencyCount: 7,
	},
	{
		id: 'wf-002',
		name: 'Payment handler',
		type: 'workflow',
		status: 'archived',
		version: 3,
		updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
		updatedBy: 'user-002',
		dependencyCount: 1,
	},
	{
		id: 'wf-003',
		name: 'Legacy invoice sync',
		type: 'workflow',
		status: 'deleted',
		version: null,
		updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
		updatedBy: null,
		dependencyCount: 0,
	},
];

const USE_MOCK = true;

export async function getPromotableChanges(
	context: IRestApiContext,
	projectId: string,
	options?: { search?: string; sort?: string; order?: string },
): Promise<PromotableResource[]> {
	if (USE_MOCK) {
		let results = [...MOCK_DATA];
		if (options?.search) {
			const term = options.search.toLowerCase();
			results = results.filter((r) => r.name.toLowerCase().includes(term));
		}
		return results;
	}

	return await makeRestApiRequest(context, 'GET', `/promotions/${projectId}/changes`, options);
}

export async function promoteChanges(
	context: IRestApiContext,
	projectId: string,
	request: PromoteRequest,
): Promise<unknown> {
	if (USE_MOCK) {
		return { branchName: `promote/${new Date().toISOString().slice(0, 16).replace(/[T:]/g, '-')}` };
	}

	return await makeRestApiRequest(context, 'POST', `/promotions/${projectId}/promote`, request);
}
