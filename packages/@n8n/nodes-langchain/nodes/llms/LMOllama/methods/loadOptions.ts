import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

export interface OllamaModel {
	name: string;
}

export async function getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials<{ baseUrl?: string }>('ollamaApi');

	const baseURL = credentials.baseUrl ?? 'http://localhost:11434';
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'ollamaApi', {
		url: `${baseURL}/api/tags`,
		method: 'GET',
	})) as { models: OllamaModel[] };

	const models = response.models || [];

	const options: INodePropertyOptions[] = models.map((model) => ({
		name: model.name,
		value: model.name,
	}));

	// Sort models by name
	options.sort((a, b) => {
		const nameA = (a.name as string).toLowerCase();
		const nameB = (b.name as string).toLowerCase();
		return nameA.localeCompare(nameB);
	});

	return options;
}
