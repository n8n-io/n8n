import {
	BedrockRuntimeClient,
	type BedrockRuntimeClientConfig,
} from '@aws-sdk/client-bedrock-runtime';
import { getNodeProxyAgent } from '@n8n/ai-utilities';
import { NodeHttpHandler, type NodeHttpHandlerOptions } from '@smithy/node-http-handler';
import type { AwsCredentialIdentity, AwsCredentialIdentityProvider } from '@smithy/types';
import {
	getAwsDomain,
	validateBedrockEndpointOverride,
	type AWSRegion,
} from 'n8n-nodes-base/aws-credentials';

// Arm TCP keepalive well before common NAT/LB idle timeouts reap the socket
// (Azure SNAT defaults to 4 minutes); probes keep the flow alive during long generations.
const KEEP_ALIVE_AGENT_OPTIONS = { keepAlive: true, keepAliveMsecs: 30_000 };

/**
 * Builds a Bedrock runtime SDK client shared by the chat and embeddings nodes.
 * The runtime plane bypasses n8n's credential `authenticate()` (the SDK does its own
 * signing/transport), so the endpoint override is injected into the client config here.
 * Retries (`maxRetries`) and request `timeout` are also applied on the SDK client because
 * ChatBedrockConverse calls `client.send()` directly, bypassing LangChain's retrying AsyncCaller.
 *
 * The HTTP/1.1 `NodeHttpHandler` is always installed, replacing the Bedrock SDK's default
 * HTTP/2 handler: the HTTP/2 handler never arms TCP keepalive (and sends no PING frames),
 * so a response idle longer than an on-path NAT/LB idle timeout is silently blackholed and
 * the node hangs. The HTTP/1.1 handler arms keepalive per request from the agent's settings.
 */
export function createBedrockRuntimeClient(params: {
	region: AWSRegion;
	credentials: AwsCredentialIdentity | AwsCredentialIdentityProvider;
	bedrockRuntimeEndpoint?: string;
	maxRetries?: number;
	timeout?: number;
}): BedrockRuntimeClient {
	const { region, credentials, bedrockRuntimeEndpoint, maxRetries, timeout } = params;

	// getAwsDomain keeps China (amazonaws.com.cn) / GovCloud endpoints correct.
	const endpoint = bedrockRuntimeEndpoint
		? validateBedrockEndpointOverride(bedrockRuntimeEndpoint, region)
		: `https://bedrock-runtime.${region}.${getAwsDomain(region)}`;
	const proxyAgent = getNodeProxyAgent(endpoint, KEEP_ALIVE_AGENT_OPTIONS);

	const clientConfig: BedrockRuntimeClientConfig = {
		region,
		credentials,
		// Set endpoint only for overrides; otherwise let the SDK derive its default.
		...(bedrockRuntimeEndpoint ? { endpoint } : {}),
	};

	// maxAttempts counts the initial try, so it's maxRetries + 1.
	if (maxRetries !== undefined) clientConfig.maxAttempts = maxRetries + 1;

	const requestHandlerOptions: NodeHttpHandlerOptions = {
		httpAgent: proxyAgent ?? KEEP_ALIVE_AGENT_OPTIONS,
		httpsAgent: proxyAgent ?? KEEP_ALIVE_AGENT_OPTIONS,
	};
	if (timeout !== undefined) {
		requestHandlerOptions.requestTimeout = timeout;
		// requestTimeout alone is a no-op. When the timeout is exceeded,
		// smithy only prints a warning to the console and keeps waiting;
		// only this flag makes it destroy the request and reject with a TimeoutError.
		requestHandlerOptions.throwOnRequestTimeout = true;
	}
	clientConfig.requestHandler = new NodeHttpHandler(requestHandlerOptions);

	return new BedrockRuntimeClient(clientConfig);
}
