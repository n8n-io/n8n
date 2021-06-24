import {
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

// https://api.baserow.io/api/redoc/#section/Authentication

export class BaserowApi implements ICredentialType {
	name = 'baserowApi';
	displayName = 'Baserow API';
	properties: INodeProperties[] = [
		{
			displayName: 'Authentication Method',
			name: 'authenticationMethod',
			type: 'options',
			default: 'apiToken',
			options: [
				{
					name: 'API Token',
					value: 'apiToken',
				},
				{
					name: 'JWT Token',
					value: 'jwtToken',
				},
			],
		},
		{
			displayName: 'API Token',
			name: 'apiToken',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authenticationMethod: [
						'apiToken',
					],
				},
			},
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authenticationMethod: [
						'jwtToken',
					],
				},
			},
		},
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			default: '',
			displayOptions: {
				show: {
					authenticationMethod: [
						'jwtToken',
					],
				},
			},
		},
	];
}
