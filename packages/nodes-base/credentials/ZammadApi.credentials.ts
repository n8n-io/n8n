import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ZammadApi implements ICredentialType {
	name = 'zammadApi';
	displayName = 'Zammad API';
	documentationUrl = 'zammad';
	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: '',
			placeholder: 'https://n8n-helpdesk.zammad.com',
			required: true,
		},
		{
			displayName: 'Auth Type',
			name: 'authType',
			type: 'options',
			default: 'tokenAuth',
			required: true,
			options: [
				{
					name: 'Basic Auth',
					value: 'basicAuth',
				},
				{
					name: 'Token Auth',
					value: 'tokenAuth',
				},
			],
		},
		{
			displayName: 'Access Token',
			name: 'accessToken',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			displayOptions: {
				show: {
					authType: [
						'tokenAuth',
					],
				},
			},
		},
		{
			displayName: 'Email',
			name: 'username',
			type: 'string',
			default: '',
			placeholder: 'helpdesk@n8n.io',
			required: true,
			displayOptions: {
				show: {
					authType: [
						'basicAuth',
					],
				},
			},
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			displayOptions: {
				show: {
					authType: [
						'basicAuth',
					],
				},
			},
		},
		{
			displayName: 'Ignore SSL Issues',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
		},
	];
}
