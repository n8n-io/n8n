/* eslint-disable n8n-nodes-base/cred-class-field-name-unsuffixed */
/* eslint-disable n8n-nodes-base/cred-class-name-unsuffixed */
import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class Crypto implements ICredentialType {
	name = 'crypto';

	displayName = 'Crypto';

	documentationUrl = 'crypto';

	icon = 'fa:key';

	properties: INodeProperties[] = [
		{
			displayName: 'Action',
			name: 'action',
			type: 'options',
			default: 'hmac',
			options: [
				{
					name: 'Hmac',
					value: 'hmac',
				},
				{
					name: 'Sign',
					value: 'sign',
				},
			],
		},
		{
			displayName: 'Secret',
			name: 'secret',
			description: 'HMAC Secret Key',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					action: ['hmac'],
				},
			},
			default: '',
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			description: 'Private key to use when signing the string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					action: ['sign'],
				},
			},
			default: '',
			placeholder:
				'-----BEGIN PRIVATE KEY-----\nXIYEvQIBADANBg<...>0IhA7TMoGYPQc=\n-----END PRIVATE KEY-----\n',
		},
	];
}
