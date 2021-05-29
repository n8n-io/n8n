import {
	ICredentialType,
	NodePropertyTypes,
} from 'n8n-workflow';

export class SshPrivateKey implements ICredentialType {
	name = 'sshPrivateKey';
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
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string' as NodePropertyTypes,
			typeOptions: {
				rows: 4,
			},
			default: '',
		},
		{
			displayName: 'Passphrase',
			name: 'passphrase',
			type: 'string' as NodePropertyTypes,
			default: '',
			description: 'Passphase used to create the key, if no passphase was used leave empty',
		},

	];
}
