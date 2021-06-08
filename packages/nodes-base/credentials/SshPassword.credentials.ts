import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SshPassword implements ICredentialType {
	name = 'sshPassword';
	displayName = 'SSH';
	properties = [
		{
			displayName: 'Host',
			name: 'host',
			required: true,
			type: 'string' as NodePropertyTypes,
			default: '',
			placeholder: 'localhost',
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
