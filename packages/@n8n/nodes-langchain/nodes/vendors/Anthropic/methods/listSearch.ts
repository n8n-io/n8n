import type { ILoadOptionsFunctions, INodeListSearchResult } from 'n8n-workflow';

import { apiRequest } from '../transport';

export async function modelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const response = (await apiRequest.call(this, 'GET', '/v1/models')) as {
		data: Array<{ id: string }>;
	};

	let models = response.data;
	if (filter) {
		models = models.filter((model) => model.id.toLowerCase().includes(filter.toLowerCase()));
	}

	return {
		results: models.map((model) => ({
			name: model.id,
			value: model.id,
		})),
	};
}
