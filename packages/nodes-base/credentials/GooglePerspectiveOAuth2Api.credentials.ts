import { ICredentialType, INodeProperties } from 'n8n-workflow';

const scopes = ['https://www.googleapis.com/auth/userinfo.email'];

export class GooglePerspectiveOAuth2Api implements ICredentialType {
	name = 'googlePerspectiveOAuth2Api';
	extends = ['googleOAuth2Api'];
	displayName = 'Google Perspective OAuth2 API';
	documentationUrl = 'google/oauth-single-service';
	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: scopes.join(' '),
		},
	];
}
