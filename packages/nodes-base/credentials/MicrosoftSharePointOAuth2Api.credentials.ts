import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftSharePointOAuth2Api implements ICredentialType {
	name = 'microsoftSharePointOAuth2Api';

	extends = ['microsoftOAuth2Api'];

	icon: Icon = 'file:icons/SharePoint.svg';

	displayName = 'Microsoft SharePoint OAuth2 API';

	documentationUrl = 'microsoft';

	properties: INodeProperties[] = [
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '=openid offline_access https://{{$self.subdomain}}.sharepoint.com/.default',
		},
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			default: '',
			hint: 'https://{subdomain}.sharepoint.com',
		},
	];
}
