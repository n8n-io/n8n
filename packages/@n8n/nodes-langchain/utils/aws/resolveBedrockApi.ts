import { assertSupportedAwsRegion, getAwsDomain } from 'n8n-nodes-base/aws-credentials';
import type { ILoadOptionsFunctions } from 'n8n-workflow';

export type BedrockApi = {
	credentialsType: 'aws' | 'awsAssumeRole';
	baseURL: string;
};

/**
 * Resolves the credential and control-plane base URL for a Bedrock list request.
 * Returning the pair as `BedrockApi` keeps the region allowlist non-optional:
 * callers cannot hand a request helper an unvalidated host.
 */
export async function resolveBedrockApi(ctx: ILoadOptionsFunctions): Promise<BedrockApi> {
	const authentication = ctx.getNodeParameter('authentication', 'iam') as 'iam' | 'assumeRole';
	const credentialsType = authentication === 'assumeRole' ? 'awsAssumeRole' : 'aws';
	const { region } = await ctx.getCredentials(credentialsType);

	assertSupportedAwsRegion(region);
	// Declares the SigV4 service+region; the credential's authenticate step swaps the
	// host for the Bedrock Endpoint override (PrivateLink) when one is configured.
	// getAwsDomain keeps China (amazonaws.com.cn) / GovCloud endpoints correct.
	return { credentialsType, baseURL: `https://bedrock.${region}.${getAwsDomain(region)}` };
}
