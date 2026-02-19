import type { TokenCredential, AccessToken } from '@azure/identity';
import { ClientOAuth2 } from '@n8n/client-oauth2';
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
	 * Type guard to check if token data has the required access_token property
	 */
	private hasAccessToken(
		data: unknown,
	): data is { access_token: string; expires_on?: number; expires_in?: number } {
		return (
			typeof data === 'object' &&
			data !== null &&
			'access_token' in data &&
			typeof (data as Record<string, unknown>).access_token === 'string'
		);
	}

	/**
	 * Gets the expiration timestamp from token data
	 * Azure returns expires_on (timestamp), standard OAuth returns expires_in (seconds)
	 */
	private getExpiresOnTimestamp(data: {
		expires_on?: number;
		expires_in?: number;
	}): number {
		if (typeof data.expires_on === 'number') {
			return data.expires_on;
		}
		if (typeof data.expires_in === 'number') {
			// Convert expires_in (seconds from now) to timestamp
			return Math.floor(Date.now() / 1000) + data.expires_in;
		}
		// Default to 1 hour from now if no expiration info
		return Math.floor(Date.now() / 1000) + 3600;
	}

	/**
	 * Gets an access token from OAuth credential
	 */
	async getToken(): Promise<AccessToken | null> {
		try {
			if (!this.credential?.oauthTokenData?.access_token) {
				throw new NodeOperationError(this.node, 'Failed to retrieve access token');
			}

			// Determine if token endpoint is v1.0 or v2.0 based on URL
			// v1.0: /oauth2/token - requires 'resource' parameter
			// v2.0: /oauth2/v2.0/token - uses 'scope' parameter
			const tokenUrl = this.credential.accessTokenUrl || '';
			const isV2Endpoint = tokenUrl.includes('/v2.0/');
			const credentialScope = this.credential.scope || '';

			// Build additional body properties
			const additionalBodyProperties: Record<string, string> = {};
			let scopes: string[] = [];

			if (isV2Endpoint) {
				// v2.0 endpoint - use scope parameter
				scopes = credentialScope.split(' ').filter(Boolean);
			} else {
				// v1.0 endpoint - use resource parameter
				// Strip .default suffix if present to get the resource URI
				let resource = credentialScope.trim();
				if (resource.endsWith('/.default')) {
					resource = resource.replace('/.default', '');
				}
				if (resource) {
					additionalBodyProperties.resource = resource;
				}
			}

			const oAuthClient = new ClientOAuth2({
				clientId: this.credential.clientId,
				clientSecret: this.credential.clientSecret,
				accessTokenUri: tokenUrl,
				scopes: isV2Endpoint ? scopes : undefined,
				authentication: this.credential.authentication,
				authorizationUri: this.credential.authUrl,
				additionalBodyProperties:
					Object.keys(additionalBodyProperties).length > 0 ? additionalBodyProperties : undefined,
			});

			const token = await oAuthClient.credentials.getToken();

			if (!this.hasAccessToken(token.data)) {
				throw new NodeOperationError(this.node, 'Token response missing access_token');
			}

			const expiresOnTimestamp = this.getExpiresOnTimestamp(token.data);

			return {
				token: token.data.access_token,
				expiresOnTimestamp,
			};
		} catch (error) {
			// Re-throw with better error message
			if (error instanceof NodeOperationError) {
				throw error;
			}
			const errorMessage = error instanceof Error ? error.message : String(error);
			throw new NodeOperationError(
				this.node,
				`Failed to retrieve OAuth2 access token: ${errorMessage}`,
			);
		}
	}

	/**
	 * Gets the deployment details from the credential
	 * When APIM is enabled, resourceName and endpoint are derived from apimBasePath
	 */
	async getDeploymentDetails() {
		if (this.credential.useApim && this.credential.apimBasePath) {
			// When using APIM, derive endpoint from apimBasePath
			// resourceName can be empty or a placeholder since azureOpenAIBasePath will be used
			return {
				apiVersion: this.credential.apiVersion,
				endpoint: undefined, // Will use azureOpenAIBasePath instead
				resourceName: 'apim', // Placeholder - not used when azureOpenAIBasePath is set
			};
		}

		return {
			apiVersion: this.credential.apiVersion,
			endpoint: this.credential.endpoint,
			resourceName: this.credential.resourceName,
		};
	}
}
