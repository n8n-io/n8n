import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class StrapiApi implements ICredentialType {
	name = 'strapiApi';
	displayName = 'Strapi API';
	documentationUrl = 'strapi';
	properties = [
		{
			displayName: 'Email',
			name: 'email',
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
			displayName: 'URL',
			name: 'url',
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'https://api.example.com',
		},
	];
}
