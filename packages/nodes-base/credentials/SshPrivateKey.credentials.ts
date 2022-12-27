import { ICredentialType, INodeProperties } from 'n8n-workflow';

export class SshPrivateKey implements ICredentialType {
	name = 'sshPrivateKey';

	displayName = 'SSH Private Key';

	documentationUrl = 'ssh';

	properties: INodeProperties[] = [
		{
			displayName: 'Host',
			name: 'host',
			required: true,
			type: 'string',
			default: '',
			placeholder: 'localhost',
		},
		{
			displayName: 'Port',
			name: 'port',
			required: true,
			type: 'number',
			default: 22,
		},
		{
			displayName: 'Username',
			name: 'username',
			type: 'string',
			default: '',
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				rows: 4,
			},
			default: '',
		},
		{
			displayName: 'Passphrase',
			name: 'passphrase',
			type: 'string',
			default: '',
			description: 'Passphase used to create the key, if no passphase was used leave empty',
		},
	];
}
