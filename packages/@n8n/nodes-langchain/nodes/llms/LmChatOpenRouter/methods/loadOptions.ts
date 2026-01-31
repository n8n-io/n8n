import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

export interface OpenRouterModel {
	id: string;
}

export async function getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials<{ url?: string }>('openRouterApi');

	const baseURL = credentials.url ?? 'https://openrouter.ai/api/v1';
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'openRouterApi', {
		url: `${baseURL}/models`,
		method: 'GET',
	})) as { data: OpenRouterModel[] };

	const models = response.data || [];

	const options: INodePropertyOptions[] = models.map((model) => ({
		name: model.id,
		value: model.id,
	}));

	// Sort models by name
	options.sort((a, b) => {
		const nameA = String(a.name).toLowerCase();
		const nameB = String(b.name).toLowerCase();
		return nameA.localeCompare(nameB);
	});

	return options;
}
