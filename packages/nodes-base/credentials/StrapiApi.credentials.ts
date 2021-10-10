import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class StrapiApi implements ICredentialType {
	name = 'strapiApi';
	displayName = 'Strapi API';
	documentationUrl = 'strapi';
	properties: INodeProperties[] = [
		{
			displayName: 'Email',
			name: 'email',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://api.example.com',
		},
	];
}
