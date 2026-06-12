import type { Icon, ICredentialType, INodeProperties } from 'n8n-workflow';

export class MicrosoftSharePointServicePrincipalApi implements ICredentialType {
	name = 'microsoftSharePointServicePrincipalApi';

	extends = ['microsoftServicePrincipalOAuth2Api'];

	icon: Icon = {
		light: 'file:icons/microsoftSharePoint.svg',
		dark: 'file:icons/microsoftSharePoint.svg',
	};

	displayName = 'Microsoft SharePoint Service Principal';

	documentationUrl = 'microsoft';

	properties: INodeProperties[] = [
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			required: true,
			default: '',
			hint: 'You can extract the subdomain from the URL. For example, in the URL "https://tenant123.sharepoint.com", the subdomain is "tenant123".',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '=https://{{$self["subdomain"]}}.sharepoint.com/.default',
		},
		{
			displayName: 'Microsoft Graph API Base URL',
			name: 'graphApiBaseUrl',
			type: 'hidden',
			default: 'https://graph.microsoft.com',
		},
	];
}
