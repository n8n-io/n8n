import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class VenafiTppApi implements ICredentialType {
	name = 'venafiTppApi';
	displayName = 'Venafi TPP API';
	properties = [
		{
			displayName: 'Domain',
			name: 'domain',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://example.com',
		},
		{
			displayName: 'Client ID',
			name: 'clientId',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Allow Self-Signed Certificates',
			name: 'allowUnauthorizedCerts',
			type: 'boolean' as NodePropertyTypes,
			default: true,
		},
	];
}
