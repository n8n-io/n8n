import type { ICredentialType, INodeProperties, Icon } from 'n8n-workflow';

// eslint-disable-next-line n8n-nodes-base/cred-class-name-unsuffixed
export class Crypto implements ICredentialType {
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-name-unsuffixed
	name = 'crypto';

	displayName = 'Crypto';

	documentationUrl = 'crypto';

	icon: Icon = 'fa:key';

	properties: INodeProperties[] = [
		{
			displayName: 'Hmac Secret',
			name: 'hmacSecret',
			type: 'string',
			description: 'Secret used in the Hmac action',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Sign Private Key',
			name: 'signPrivateKey',
			type: 'string',
			description: 'Private Key used in the Sign action',
			typeOptions: {
				rows: 4,
				password: true,
			},
			default: '',
		},
	];
}
