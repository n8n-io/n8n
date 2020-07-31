import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class Ftp implements ICredentialType {
	name = 'ftp';
	displayName = 'FTP';
	properties = [
		{
			displayName: 'Host',
			name: 'host',
			required: true,
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'localhost'
		},
		{
			displayName: 'Port',
			name: 'port',
			required: true,
			type: 'number' as NodePropertyTypes,
			default: 21,
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
	];
}
