import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

import { apiRequest } from '../transport';

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

export async function modelSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	let { data } = await apiRequest.call(this, 'GET', '/models');

	data = data?.filter((model: IDataObject) => (model.id as string).startsWith('gpt-'));

	let results: INodeListSearchItems[] = [];

	if (filter) {
		for (const model of data || []) {
			if ((model.id as string)?.toLowerCase().includes(filter.toLowerCase())) {
				results.push({
					name: (model.id as string).toUpperCase(),
					value: model.id as string,
				});
			}
		}
	} else {
		results = (data || []).map((model: IDataObject) => ({
			name: (model.id as string).toUpperCase(),
			value: model.id as string,
		}));
	}

	results = results.sort((a, b) => a.name.localeCompare(b.name));

	return {
		results,
	};
}

export async function assistantSearch(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const { data, has_more, last_id } = await apiRequest.call(this, 'GET', '/assistants', {
		headers: {
			'OpenAI-Beta': 'assistants=v2',
		},
		qs: {
			limit: 100,
			after: paginationToken,
		},
	});

	if (has_more === true) {
		paginationToken = last_id;
	} else {
		paginationToken = undefined;
	}

	if (filter) {
		const results: INodeListSearchItems[] = [];

		for (const assistant of data || []) {
			if ((assistant.name as string)?.toLowerCase().includes(filter.toLowerCase())) {
				results.push({
					name: assistant.name as string,
					value: assistant.id as string,
				});
			}
		}

		return {
			results,
		};
	} else {
		return {
			results: (data || []).map((assistant: IDataObject) => ({
				name: assistant.name as string,
				value: assistant.id as string,
			})),
			paginationToken,
		};
	}
}
