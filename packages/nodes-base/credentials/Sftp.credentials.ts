import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class Sftp implements ICredentialType {
	name = 'sftp';
	displayName = 'SFTP';
	documentationUrl = 'sftp';
	properties = [
		{
			displayName: 'Host',
			name: 'host',
			required: true,
			type: 'string' as NodePropertyTypes,
			default: '',
		},
		{
			displayName: 'Port',
			name: 'port',
			required: true,
			type: 'number' as NodePropertyTypes,
			default: 22,
		},
		{
			displayName: 'Username',
			name: 'username',
			required: true,
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
