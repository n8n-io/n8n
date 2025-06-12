import type {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';

export interface AnthropicModel {
	id: string;
	display_name: string;
	type: string;
	created_at: string;
}

export async function searchModels(
	this: ILoadOptionsFunctions,
	filter?: string,
): Promise<INodeListSearchResult> {
	const credentials = await this.getCredentials<{ url?: string }>('anthropicApi');

	const baseURL = credentials.url ?? 'https://api.anthropic.com';
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'anthropicApi', {
		url: `${baseURL}/v1/models`,
		headers: {
			'anthropic-version': '2023-06-01',
		},
	})) as { data: AnthropicModel[] };

	const models = response.data || [];
	let results: INodeListSearchItems[] = [];

	if (filter) {
		for (const model of models) {
			if (model.id.toLowerCase().includes(filter.toLowerCase())) {
				results.push({
					name: model.display_name,
					value: model.id,
				});
			}
		}
	} else {
		results = models.map((model) => ({
			name: model.display_name,
			value: model.id,
		}));
	}

	// Sort models with more recent ones first (claude-3 before claude-2)
	results = results.sort((a, b) => {
		const modelA = models.find((m) => m.id === a.value);
		const modelB = models.find((m) => m.id === b.value);

		if (!modelA || !modelB) return 0;

		// Sort by created_at date, most recent first
		const dateA = new Date(modelA.created_at);
		const dateB = new Date(modelB.created_at);
		return dateB.getTime() - dateA.getTime();
	});

	return {
		results,
	};
}
