import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class Smtp implements ICredentialType {
	name = 'smtp';
	displayName = 'SMTP';
	documentationUrl = 'smtp';
	properties = [
		{
			displayName: 'User',
			name: 'user',
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
			displayName: 'Host',
			name: 'host',
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Port',
			name: 'port',
			type: 'number' as NodePropertyTypes,
			default: 465,
		},
		{
			displayName: 'SSL/TLS',
			name: 'secure',
			type: 'boolean' as NodePropertyTypes,
			default: true,
		},
	];
}
