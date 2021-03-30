import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';


export class Imap implements ICredentialType {
	name = 'imap';
	displayName = 'IMAP';
	documentationUrl = 'imap';
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
			default: 993,
		},
		{
			displayName: 'SSL/TLS',
			name: 'secure',
			type: 'boolean' as NodePropertyTypes,
			default: true,
		},
	];
}
