import type { ICredentialType, INodeProperties, Icon, ThemeIconColor } from 'n8n-workflow';

export class Crypto implements ICredentialType {
	name = 'crypto';

	displayName = 'Crypto';

	documentationUrl = 'crypto';

	icon: Icon = 'fa:key';

	iconColor: ThemeIconColor = 'green';

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
			displayName: 'Private Key',
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
