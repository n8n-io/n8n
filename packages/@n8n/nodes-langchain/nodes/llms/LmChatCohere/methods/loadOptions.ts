import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

export interface CohereModel {
	name: string;
	description?: string;
}

export async function getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials<{ url?: string }>('cohereApi');

	const baseURL = credentials.url ?? 'https://api.cohere.ai';
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'cohereApi', {
		url: `${baseURL}/v1/models?page_size=100&endpoint=chat`,
		method: 'GET',
	})) as { models: CohereModel[] };

	const models = response.models || [];

	const options: INodePropertyOptions[] = models.map((model) => ({
		name: model.name,
		value: model.name,
		description: model.description,
	}));

	// Sort models by name
	options.sort((a, b) => {
		const nameA = String(a.name).toLowerCase();
		const nameB = String(b.name).toLowerCase();
		return nameA.localeCompare(nameB);
	});

	return options;
}
