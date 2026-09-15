import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import {
	listBedrockInferenceProfiles,
	toProfileOption,
} from '@utils/aws/listBedrockInferenceProfiles';
import { resolveBedrockApi } from '@utils/aws/resolveBedrockApi';

export async function listModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const api = await resolveBedrockApi(this);

	const [foundationModels, inferenceProfiles] = await Promise.allSettled([
		this.helpers.httpRequestWithAuthentication.call(this, api.credentialsType, {
			method: 'GET',
			baseURL: api.baseURL,
			url: '/foundation-models?&byOutputModality=TEXT&byInferenceType=ON_DEMAND',
			json: true,
		}) as Promise<{
			modelSummaries?: Array<{ modelId: string; modelName: string; modelArn: string }>;
		}>,
		listBedrockInferenceProfiles(this, api),
	]);

	// The credential may lack one of the two list permissions
	// (bedrock:ListFoundationModels / bedrock:ListInferenceProfiles);
	// a single reachable source still renders a usable dropdown.
	if (foundationModels.status === 'rejected' && inferenceProfiles.status === 'rejected') {
		throw foundationModels.reason;
	}
	if (foundationModels.status === 'rejected') {
		this.logger.warn('Bedrock model listing: foundation-models request failed', {
			error: foundationModels.reason,
		});
	}
	if (inferenceProfiles.status === 'rejected') {
		this.logger.warn('Bedrock model listing: inference-profiles request failed', {
			error: inferenceProfiles.reason,
		});
	}

	const options: INodePropertyOptions[] = [];
	if (foundationModels.status === 'fulfilled') {
		options.push(
			...(foundationModels.value.modelSummaries ?? []).map((model) => ({
				name: model.modelName,
				value: model.modelId,
				description: model.modelArn,
			})),
		);
	}
	if (inferenceProfiles.status === 'fulfilled') {
		options.push(...inferenceProfiles.value.map(toProfileOption));
	}
	return options.sort((a, b) => a.name.localeCompare(b.name));
}

export async function listInferenceProfiles(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const profiles = await listBedrockInferenceProfiles(this, await resolveBedrockApi(this));
	return profiles.map(toProfileOption).sort((a, b) => a.name.localeCompare(b.name));
}
