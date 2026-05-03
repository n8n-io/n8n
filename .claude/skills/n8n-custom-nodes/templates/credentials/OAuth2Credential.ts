/**
 * TEMPLATE: OAuth2 Credential
 *
 * Extends the base oAuth2Api credential type. n8n handles the full OAuth2
 * authorization code flow (redirect, token exchange, refresh) automatically.
 * You only need to provide the service-specific URLs and scopes.
 *
 * Replace all occurrences of:
 *   - __ServiceName__     → Your service display name (PascalCase)
 *   - __serviceName__     → Your credential name (camelCase)
 *   - __AUTH_URL__        → Authorization endpoint URL
 *   - __TOKEN_URL__       → Token endpoint URL
 *   - __SCOPES__          → Space-separated OAuth scopes
 */
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class __ServiceName__OAuth2Api implements ICredentialType {
	name = '__serviceName__OAuth2Api';

	displayName = '__ServiceName__ OAuth2 API';

	documentationUrl = '__serviceName__';

	extends = ['oAuth2Api'];

	properties: INodeProperties[] = [
		{
			displayName: 'Grant Type',
			name: 'grantType',
			type: 'hidden',
			default: 'authorizationCode',
		},
		{
			displayName: 'Authorization URL',
			name: 'authUrl',
			type: 'hidden',
			default: '__AUTH_URL__',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: '__TOKEN_URL__',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '__SCOPES__',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: '',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			// 'header' = sends client_id/secret in Authorization header
			// 'body' = sends client_id/secret in request body
			default: 'header',
		},
	];
}
