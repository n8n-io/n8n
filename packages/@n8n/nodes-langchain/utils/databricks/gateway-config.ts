import type { ClientOptions } from '@langchain/openai';
import { getProxyAgent } from '@n8n/ai-utilities';
import type { ISupplyDataFunctions } from 'n8n-workflow';

import type { RefreshingTokenSource } from '../oauth2-token-provider';
import { createDatabricksAuthFetch } from './auth-fetch';
import { assertHttpsHost, gatewayBaseUrl } from './constants';
import { wrapDatabricksErrorFetch } from './error-handling';
import type { DatabricksOAuth2Credential } from './token-provider';

/**
 * Builds the OpenAI-client transport for the Unity AI Gateway: the gateway
 * base URL, an authenticating fetch that keeps the token fresh and reshapes
 * Databricks error bodies, and a proxy dispatcher honouring the egress policy.
 *
 * The token source comes back so the caller can build its own failed-attempt
 * handler, which needs `expiredStatus`. `timeout` is optional and applied as
 * given: each node decides whether an unset Timeout option means a default.
 */
export function createDatabricksGatewayConfig(
	ctx: ISupplyDataFunctions,
	credential: DatabricksOAuth2Credential,
	timeout?: number,
): { configuration: ClientOptions; tokenSource: RefreshingTokenSource } {
	assertHttpsHost(ctx, credential.host);

	const baseURL = gatewayBaseUrl(credential.host);
	const egressFilter = ctx.helpers.getSecureEgressFilter();
	const { fetch: authFetch, tokenSource } = createDatabricksAuthFetch(ctx, credential, {
		endpointUrl: baseURL,
		egressFilter,
		baseFetch: fetch,
	});

	const configuration: ClientOptions = {
		baseURL,
		fetch: wrapDatabricksErrorFetch(authFetch),
		fetchOptions: {
			dispatcher: getProxyAgent(
				baseURL,
				{
					headersTimeout: timeout,
					bodyTimeout: timeout,
				},
				egressFilter,
			),
		},
	};

	return { configuration, tokenSource };
}
