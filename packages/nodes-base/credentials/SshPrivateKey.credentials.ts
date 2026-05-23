import type { ICredentialType, INodeProperties } from 'n8n-workflow';

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
				// Render as <textarea> (rows > 1) so multi-line OpenSSH keys preserve newlines
				// when pasted. `password: true` forces an <input type="password"> which silently
				// strips newlines, leaving a single-line base64 blob that ssh2 cannot parse.
				// See: https://github.com/n8n-io/n8n/issues/31007
				rows: 4,
			},
			default: '',
			description:
				'Private key in OpenSSH format. Paste the full key including the `-----BEGIN ... PRIVATE KEY-----` and `-----END ... PRIVATE KEY-----` lines.',
		},
		{
			displayName: 'Passphrase',
			name: 'passphrase',
			type: 'string',
			default: '',
			description: 'Passphase used to create the key, if no passphase was used leave empty',
			typeOptions: { password: true },
		},
	];
}
