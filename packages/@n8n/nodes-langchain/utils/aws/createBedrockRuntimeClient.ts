import {
	BedrockRuntimeClient,
	type BedrockRuntimeClientConfig,
} from '@aws-sdk/client-bedrock-runtime';
import { getNodeProxyAgent } from '@n8n/ai-utilities';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@smithy/types';
import {
	getAwsDomain,
	validateBedrockEndpointOverride,
	type AWSRegion,
} from 'n8n-nodes-base/aws-credentials';

/**
 * Builds a Bedrock runtime SDK client shared by the chat and embeddings nodes.
 * The runtime plane bypasses n8n's credential `authenticate()` (the SDK does its own
 * signing/transport), so the endpoint override is injected into the client config here.
 */
export function createBedrockRuntimeClient(params: {
	region: AWSRegion;
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
	bedrockRuntimeEndpoint?: string;
}): BedrockRuntimeClient {
	const { region, credentials, bedrockRuntimeEndpoint } = params;

	// getAwsDomain keeps China (amazonaws.com.cn) / GovCloud endpoints correct.
	const endpoint = bedrockRuntimeEndpoint
		? validateBedrockEndpointOverride(bedrockRuntimeEndpoint, region)
		: `https://bedrock-runtime.${region}.${getAwsDomain(region)}`;
	const proxyAgent = getNodeProxyAgent(endpoint);

	const clientConfig: BedrockRuntimeClientConfig = {
		region,
		credentials,
		// Set endpoint only for overrides; otherwise let the SDK derive its default.
		...(bedrockRuntimeEndpoint ? { endpoint } : {}),
	};
	if (proxyAgent) {
		clientConfig.requestHandler = new NodeHttpHandler({
			httpAgent: proxyAgent,
			httpsAgent: proxyAgent,
		});
	}

	return new BedrockRuntimeClient(clientConfig);
}
