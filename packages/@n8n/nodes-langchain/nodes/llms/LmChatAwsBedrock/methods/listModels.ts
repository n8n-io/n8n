import { assertSupportedAwsRegion, getAwsDomain } from 'n8n-nodes-base/aws-credentials';
import type { ILoadOptionsFunctions, INodePropertyOptions } from 'n8n-workflow';

export async function listModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const authentication = this.getNodeParameter('authentication', 'iam') as 'iam' | 'assumeRole';
	const credentialsType = authentication === 'assumeRole' ? 'awsAssumeRole' : 'aws';
	const { region } = await this.getCredentials(credentialsType);

	assertSupportedAwsRegion(region);
	// Declares the SigV4 service+region; the credential's authenticate step swaps the
	// host for the Bedrock Endpoint override (PrivateLink) when one is configured.
	const baseURL = `https://bedrock.${region}.${getAwsDomain(region)}`;

	const [foundationModels, inferenceProfiles] = await Promise.allSettled([
		this.helpers.httpRequestWithAuthentication.call(this, credentialsType, {
			method: 'GET',
			baseURL,
			url: '/foundation-models?&byOutputModality=TEXT&byInferenceType=ON_DEMAND',
			json: true,
		}) as Promise<{
			modelSummaries?: Array<{ modelId: string; modelName: string; modelArn: string }>;
		}>,
		this.helpers.httpRequestWithAuthentication.call(this, credentialsType, {
			method: 'GET',
			baseURL,
			url: '/inference-profiles?maxResults=1000',
			json: true,
		}) as Promise<{
			inferenceProfileSummaries?: Array<{
				inferenceProfileId: string;
				inferenceProfileName: string;
				inferenceProfileArn: string;
				description?: string;
			}>;
		}>,
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
		options.push(
			...(inferenceProfiles.value.inferenceProfileSummaries ?? []).map((profile) => ({
				name: profile.inferenceProfileName,
				value: profile.inferenceProfileId,
				description: profile.description ?? profile.inferenceProfileArn,
			})),
		);
	}
	return options.sort((a, b) => a.name.localeCompare(b.name));
}
