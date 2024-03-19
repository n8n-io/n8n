import type { ICredentialType, INodeProperties } from 'n8n-workflow';

// eslint-disable-next-line n8n-nodes-base/cred-class-name-unsuffixed
export class WebhookJwtAuth implements ICredentialType {
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-name-unsuffixed
	name = 'webhookJwtAuth';

	displayName = 'JWT Auth';

	documentationUrl = 'webhookJwtAuth';

	icon = 'file:icons/jwt.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Token Secret',
			description:
				'The secret that was used to sign the JWT token. It is used to verify the signature of the token.',
			name: 'secret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
		{
			displayName: 'Algorithm',
			description: 'The algorithm that was used to sign the JWT token',
			name: 'algorithm',
			type: 'options',
			default: 'HS256',
			options: [
				{
					name: 'HS256',
					value: 'HS256',
				},
				{
					name: 'HS384',
					value: 'HS384',
				},
				{
					name: 'HS512',
					value: 'HS512',
				},
				{
					name: 'RS256',
					value: 'RS256',
				},
				{
					name: 'RS384',
					value: 'RS384',
				},
				{
					name: 'RS512',
					value: 'RS512',
				},
				{
					name: 'ES256',
					value: 'ES256',
				},
				{
					name: 'ES384',
					value: 'ES384',
				},
				{
					name: 'ES512',
					value: 'ES512',
				},
				{
					name: 'PS256',
					value: 'PS256',
				},
				{
					name: 'PS384',
					value: 'PS384',
				},
				{
					name: 'PS512',
					value: 'PS512',
				},
				{
					name: 'none',
					value: 'none',
				},
			],
		},
	];
}
