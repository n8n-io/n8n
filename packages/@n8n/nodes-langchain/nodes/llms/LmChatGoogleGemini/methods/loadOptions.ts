import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

export interface GoogleModel {
	name: string;
	description: string;
	displayName?: string;
}

export async function getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const credentials = await this.getCredentials<{ host?: string }>('googlePalmApi');

	const baseURL = credentials.host ?? 'https://generativelanguage.googleapis.com';
	const response = (await this.helpers.httpRequestWithAuthentication.call(this, 'googlePalmApi', {
		url: `${baseURL}/v1beta/models`,
		method: 'GET',
	})) as { models: GoogleModel[] };

	const models = response.models || [];

	// Filter out embedding models
	const chatModels = models.filter((model) => !model.name.includes('embedding'));

	const options: INodePropertyOptions[] = chatModels.map((model) => ({
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
