import type { ICredentialType, INodeProperties } from 'n8n-workflow';
import { z } from 'zod';

export const GoogleOAuth2ApiSchema = z.object({
	grantType: z.string().default('authorizationCode'),
	authorizationUrl: z.string().url().default('https://accounts.google.com/o/oauth2/v2/auth'),
	accessTokenUrl: z.string().url().default('https://oauth2.googleapis.com/token'),
	authQueryParameters: z
		.record(z.string(), z.string())
		.default({ access_type: 'offline', prompt: 'consent' }),
	authentication: z.string().default('body'),
});

export type GoogleOauth2ApiType = z.infer<typeof GoogleOAuth2ApiSchema>;

export class GoogleOAuth2Api implements ICredentialType {
	name = 'googleOAuth2Api';

	extends = ['oAuth2Api'];

	displayName = 'Google OAuth2 API';

	documentationUrl = 'google/oauth-generic';

	icon = 'file:icons/Google.svg';

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
			default: 'https://accounts.google.com/o/oauth2/v2/auth',
		},
		{
			displayName: 'Access Token URL',
			name: 'accessTokenUrl',
			type: 'hidden',
			default: 'https://oauth2.googleapis.com/token',
		},
		{
			displayName: 'Auth URI Query Parameters',
			name: 'authQueryParameters',
			type: 'hidden',
			default: 'access_type=offline&prompt=consent',
		},
		{
			displayName: 'Authentication',
			name: 'authentication',
			type: 'hidden',
			default: 'body',
		},
	];
}
