import type { TokenCredential, AccessToken } from '@azure/identity';
import type { ClientOAuth2TokenData } from '@n8n/client-oauth2';
import { ClientOAuth2 } from '@n8n/client-oauth2';
import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { AZURE_COGNITIVE_SERVICES_RESOURCE } from './constants';
import type { AzureEntraCognitiveServicesOAuth2ApiCredential } from '../types';

/**
 * Turns the token response into the epoch MILLISECONDS `AccessToken` expects.
 *
 * Both fields Entra can send are in seconds: `expires_in` counts from now, and the v1 endpoint
 * also sends `expires_on` as an epoch second. The caller's token cycler compares this value
 * against `Date.now()`, so handing it seconds puts every token in 1970 and re-authenticates on
 * every model call.
 *
 * An unreadable expiry returns `Date.now()`, which reads as expired. That keeps the old
 * fetch-every-call behaviour rather than caching a token of unknown lifetime.
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
	) {}

	/**
	 * Gets an access token from OAuth credential.
	 *
	 * This is a client-credentials (app-only) sign-in: the caller's client ID and secret buy the
	 * token, so no stored browser token is involved.
	 */
	async getToken(): Promise<AccessToken | null> {
		try {
			const oAuthClient = new ClientOAuth2({
				clientId: this.credential.clientId,
				clientSecret: this.credential.clientSecret,
				accessTokenUri: this.credential.accessTokenUrl,
				scopes: this.credential.scope?.split(' '),
				authentication: this.credential.authentication,
				authorizationUri: this.credential.authUrl,
				additionalBodyProperties: {
					resource: AZURE_COGNITIVE_SERVICES_RESOURCE,
				},
			});

			const token = await oAuthClient.credentials.getToken();
			return {
				token: token.data.access_token,
				expiresOnTimestamp: expiresOnTimestamp(token.data),
			};
		} catch (error) {
			// Re-throw with better error message
			throw new NodeOperationError(this.node, 'Failed to retrieve OAuth2 access token', error);
		}
	}

	/**
	 * Gets the deployment details from the credential
	 */
	async getDeploymentDetails() {
		if (this.credential.endpointType === 'foundry') {
			return {
				apiVersion: this.credential.apiVersion ?? '',
				endpoint: this.credential.foundryEndpoint ?? '',
				resourceName: this.credential.resourceName ?? '',
				endpointType: 'foundry' as const,
				foundryEndpoint: this.credential.foundryEndpoint,
			};
		}
		return {
			apiVersion: this.credential.apiVersion ?? '',
			endpoint: this.credential.endpoint ?? '',
			resourceName: this.credential.resourceName ?? '',
		};
	}
}
