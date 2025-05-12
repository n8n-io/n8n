import type { TokenCredential, AccessToken } from '@azure/identity';
import type { INode } from 'n8n-workflow';
import { jsonParse, NodeOperationError } from 'n8n-workflow';
import type {
	ClientOAuth2Options,
	ClientOAuth2RequestObject,
	ClientOAuth2TokenData,
	OAuth2CredentialData,
} from '@n8n/client-oauth2';
import { ClientOAuth2 } from '@n8n/client-oauth2';

import type { AzureEntraCognitiveServicesOAuth2ApiCredential } from '../types';
/**
 * Adapts n8n's credential retrieval into the TokenCredential interface expected by @azure/identity
 */
export class N8nOAuth2TokenCredential implements TokenCredential {
	constructor(
		private node: INode,
		private credential: AzureEntraCognitiveServicesOAuth2ApiCredential,
	) {}

	/**
	 * Gets an access token from OAuth credential
	 */
	async getToken(): Promise<AccessToken | null> {
		try {
			if (!this.credential?.oauthTokenData?.access_token) {
				throw new NodeOperationError(this.node, 'Failed to retrieve access token');
			}
			const expirationDate = new Date(this.credential.oauthTokenData.expires_on * 1000);
			// Refresh token if it's 5 minutes before expiration
			const beforeExpiration = Date.now() - 5 * 60 * 1000;
			if (expirationDate.getTime() < beforeExpiration) {
				console.log('Refreshing token before expiration');
				const oAuthClient = new ClientOAuth2({
					clientId: this.credential.clientId,
					clientSecret: this.credential.clientSecret,
					accessTokenUri: this.credential.accessTokenUrl,
					scopes: this.credential.scope?.split(' '),
					authentication: this.credential.authentication,
					authorizationUri: this.credential.authUrl,
					additionalBodyProperties: {
						resource: 'https://cognitiveservices.azure.com/',
					},
				});

				const token = await oAuthClient.credentials.getToken();
				const data = token.data as ClientOAuth2TokenData & {
					expires_on: number;
					ext_expires_on: number;
				};
				const refreshToken = oAuthClient.createToken({
					...data,
				});

				this.credential.oauthTokenData = data;
				return {
					token: data.access_token,
					expiresOnTimestamp: data.expires_on,
				};
			}
			const oAuthData = this.credential.oauthTokenData;

			return {
				token: this.credential.oauthTokenData.access_token,
				expiresOnTimestamp: this.credential.oauthTokenData.expires_on,
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
		return {
			apiVersion: this.credential.apiVersion,
			endpoint: this.credential.endpoint,
			resourceName: this.credential.resourceName,
		};
	}
}
