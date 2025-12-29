import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

export interface MistralModel {
	id: string;
}

export async function getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const baseURL = 'https://api.mistral.ai/v1';
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'mistralCloudApi', {
		url: `${baseURL}/models`,
		method: 'GET',
	})) as { data: MistralModel[] };

	const models = response.data || [];

	// Filter out embedding models
	const chatModels = models.filter((model) => !model.id.includes('embed'));

	const options: INodePropertyOptions[] = chatModels.map((model) => ({
		name: model.id,
		value: model.id,
	}));

	// Sort models by name
	options.sort((a, b) => {
		const nameA = (a.name as string).toLowerCase();
		const nameB = (b.name as string).toLowerCase();
		return nameA.localeCompare(nameB);
	});

	return options;
}
