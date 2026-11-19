import type { TokenCredential, AccessToken } from '@azure/identity';
import type { ClientOAuth2TokenData } from '@n8n/client-oauth2';
import { ClientOAuth2 } from '@n8n/client-oauth2';
import type { INode, NodeEgressFilter } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { requireTenantId } from './requireTenantId';
import {
	AZURE_OPENAI_INFERENCE_AUDIENCE,
	type AzureEntraCognitiveServicesOAuth2ApiCredential,
} from '../types';

/**
 * Entra reports seconds; `AccessToken.expiresOnTimestamp` is epoch milliseconds. An unreadable
 * expiry reads as already expired.
 *
 * `expires_on` is named here because `ClientOAuth2TokenData` does not declare it. It is an extra
 * the v1.0 endpoint sends, and it would otherwise only compile through the index signature.
 */
function expiresOnTimestamp(data: ClientOAuth2TokenData & { expires_on?: string }): number {
	const expiresIn = Number(data.expires_in);
	if (Number.isFinite(expiresIn) && expiresIn > 0) return Date.now() + expiresIn * 1000;

	const expiresOn = Number(data.expires_on);
	if (Number.isFinite(expiresOn) && expiresOn > 0) return expiresOn * 1000;

	return Date.now();
}

/**
 * Adapts n8n's credential retrieval into the TokenCredential interface expected by @azure/identity
 */
export class N8nOAuth2TokenCredential implements TokenCredential {
	constructor(
		private node: INode,
		private credential: AzureEntraCognitiveServicesOAuth2ApiCredential,
		private audience: string = AZURE_OPENAI_INFERENCE_AUDIENCE,
		private egressFilter?: NodeEgressFilter,
	) {}

	/**
	 * The `scopes` argument of `TokenCredential` is deliberately not taken. The v1.0 endpoint
	 * selects the audience from the `resource` body parameter, which comes from the constructor.
	 */
	async getToken(): Promise<AccessToken | null> {
		// Outside the try: a misconfigured tenant is not a token-endpoint failure and should not
		// be reported as one.
		requireTenantId(this.node, this.credential.tenantId);

		try {
			const oAuthClient = new ClientOAuth2({
				clientId: this.credential.clientId,
				clientSecret: this.credential.clientSecret,
				accessTokenUri: this.credential.accessTokenUrl,
				scopes: this.credential.scope?.split(' '),
				authentication: this.credential.authentication,
				authorizationUri: this.credential.authUrl,
				additionalBodyProperties: {
					resource: `${this.audience}/`,
				},
				// Applies the egress policy inside the client, so a stored accessTokenUrl cannot
				// send the client secret somewhere the node is not allowed to reach.
				ssrfBridge: this.egressFilter,
			});

			const token = await oAuthClient.credentials.getToken();
			return {
				token: token.data.access_token,
				expiresOnTimestamp: expiresOnTimestamp(token.data),
			};
		} catch (error) {
			throw new NodeOperationError(this.node, 'Failed to retrieve OAuth2 access token', error);
		}
	}

	async getDeploymentDetails() {
		if (this.credential.endpointType === 'foundry') {
			return {
				apiVersion: this.credential.apiVersion ?? '',
				endpoint: this.credential.foundryEndpoint,
				resourceName: this.credential.resourceName ?? '',
				endpointType: 'foundry' as const,
				foundryEndpoint: this.credential.foundryEndpoint,
			};
		}
		return {
			apiVersion: this.credential.apiVersion ?? '',
			endpoint: this.credential.endpoint,
			resourceName: this.credential.resourceName ?? '',
		};
	}
}
