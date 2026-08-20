import { assertSupportedAwsRegion, getAwsDomain } from 'n8n-nodes-base/aws-credentials';
import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

import type { BedrockInferenceProfileSummary } from '@utils/aws/listBedrockInferenceProfiles';
import { listBedrockInferenceProfiles } from '@utils/aws/listBedrockInferenceProfiles';

async function resolveBedrockApi(ctx: ILoadOptionsFunctions) {
	const authentication = ctx.getNodeParameter('authentication', 'iam') as 'iam' | 'assumeRole';
	const credentialsType = authentication === 'assumeRole' ? 'awsAssumeRole' : 'aws';
	const { region } = await ctx.getCredentials(credentialsType);

	assertSupportedAwsRegion(region);
	// Declares the SigV4 service+region; the credential's authenticate step swaps the
	// host for the Bedrock Endpoint override (PrivateLink) when one is configured.
	const baseURL = `https://bedrock.${region}.${getAwsDomain(region)}`;
	return { credentialsType, baseURL } as const;
}

function toProfileOption(profile: BedrockInferenceProfileSummary): INodePropertyOptions {
	return {
		name: profile.inferenceProfileName,
		value: profile.inferenceProfileId,
		description: profile.description ?? profile.inferenceProfileArn,
	};
}

export async function listModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const { credentialsType, baseURL } = await resolveBedrockApi(this);

	const [foundationModels, inferenceProfiles] = await Promise.allSettled([
		this.helpers.httpRequestWithAuthentication.call(this, credentialsType, {
			method: 'GET',
			baseURL,
			url: '/foundation-models?&byOutputModality=TEXT&byInferenceType=ON_DEMAND',
			json: true,
		}) as Promise<{
			modelSummaries?: Array<{ modelId: string; modelName: string; modelArn: string }>;
		}>,
		listBedrockInferenceProfiles(this, credentialsType, baseURL),
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
	const { credentialsType, baseURL } = await resolveBedrockApi(this);
	const profiles = await listBedrockInferenceProfiles(this, credentialsType, baseURL);
	return profiles.map(toProfileOption).sort((a, b) => a.name.localeCompare(b.name));
}
