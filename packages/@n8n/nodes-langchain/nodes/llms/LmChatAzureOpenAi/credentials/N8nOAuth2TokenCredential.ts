import type { TokenCredential, AccessToken } from '@azure/identity';
import type { INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

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
