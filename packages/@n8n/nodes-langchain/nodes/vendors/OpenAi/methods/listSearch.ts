import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import type { Assistant } from 'openai/resources/beta/assistants';
import type { Model } from 'openai/resources/models';

import { shouldIncludeModel } from '../helpers/modelFiltering';
import { apiRequest } from '../transport';
import { loadModelMetadata } from '@utils/modelMetadataLoader';

export async function fileSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const { data } = await apiRequest.call(this, 'GET', '/files');

	if (filter) {
		const results: INodeListSearchItems[] = [];

		for (const file of data || []) {
			if ((file.filename as string)?.toLowerCase().includes(filter.toLowerCase())) {
				results.push({
					name: file.filename as string,
					value: file.id as string,
				});
			}
		}

		return {
			results,
		};
	} else {
		return {
			results: (data || []).map((file: IDataObject) => ({
				name: file.filename as string,
				value: file.id as string,
			})),
		};
	}
}

const getModelSearch =
	(filterCondition: (model: Model) => boolean) =>
	async (ctx: ILoadOptionsFunctions, filter?: string): Promise<INodeListSearchResult> => {
		let { data } = (await apiRequest.call(ctx, 'GET', '/models')) as { data: Model[] };

		data = data?.filter((model) => filterCondition(model));

		// Apply filter if provided
		const filteredModels = filter
			? (data || []).filter((model) => model.id?.toLowerCase().includes(filter.toLowerCase()))
			: data || [];

		// Load metadata for all models in parallel
		const metadataResults = await Promise.all(
			filteredModels.map(async (model) => await loadModelMetadata('openai', model.id)),
		);

		// Combine models with their metadata
		let results: INodeListSearchItems[] = filteredModels.map((model, idx) => ({
			name: model.id.toUpperCase(),
			value: model.id,
			metadata: metadataResults[idx],
		}));

		results = results.sort((a, b) => a.name.localeCompare(b.name));
		return {
			results,
		};
	};

export async function modelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<{ url: string }>('openAiApi');
	const url = credentials.url && new URL(credentials.url);
	const isCustomAPI = !!(url && !['api.openai.com', 'ai-assistant.n8n.io'].includes(url.hostname));
	return await getModelSearch((model) => shouldIncludeModel(model.id, isCustomAPI))(this, filter);
}

export async function videoModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await getModelSearch((model) => model.id.includes('sora'))(this, filter);
}

export async function imageModelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	return await getModelSearch(
		(model) => model.id.includes('vision') || model.id.includes('gpt-4o'),
	)(this, filter);
}

export async function assistantSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { data, has_more, last_id } = (await apiRequest.call(this, 'GET', '/assistants', {
		headers: {
			'OpenAI-Beta': 'assistants=v2',
		},
		qs: {
			limit: 100,
			after: paginationToken,
		},
	})) as {
		data: Assistant[];
		has_more: boolean;
		last_id: string;
		first_id: string;
	};

	if (has_more) {
		paginationToken = last_id;
	} else {
		paginationToken = undefined;
	}

	if (filter) {
		const results: INodeListSearchItems[] = [];

		for (const assistant of data || []) {
			if (assistant.name?.toLowerCase().includes(filter.toLowerCase())) {
				results.push({
					name: assistant.name,
					value: assistant.id,
				});
			}
		}

		return {
			results,
		};
	} else {
		return {
			results: (data || []).map((assistant) => ({
				name: assistant.name ?? assistant.id,
				value: assistant.id,
			})),
			paginationToken,
		};
	}
}
