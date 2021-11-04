import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class MicrosoftDynamicsOAuth2Api implements ICredentialType {
	name = 'microsoftDynamicsOAuth2Api';
	extends = [
		'microsoftOAuth2Api',
	];
	displayName = 'Microsoft Dynamics OAuth2 API';
	documentationUrl = 'microsoft';
	properties: INodeProperties[] = [
		//https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent
		{
			displayName: 'Subdomain',
			name: 'subdomain',
			type: 'string',
			required: true,
			placeholder: 'organization',
			default: '',
		},
		{
			displayName: 'Scope',
			name: 'scope',
			type: 'hidden',
			default: '=openid offline_access https://{{$self.subdomain}}.crm.dynamics.com/.default',
		},
	];
}
