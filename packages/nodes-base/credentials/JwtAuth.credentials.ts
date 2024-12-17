import type { ICredentialType, INodeProperties, INodePropertyOptions, Icon } from 'n8n-workflow';

const algorithms: INodePropertyOptions[] = [
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
];

// eslint-disable-next-line n8n-nodes-base/cred-class-name-unsuffixed
export class JwtAuth implements ICredentialType {
	// eslint-disable-next-line n8n-nodes-base/cred-class-field-name-unsuffixed
	name = 'jwtAuth';

	displayName = 'JWT Auth';

	documentationUrl = 'jwt';

	icon: Icon = 'file:icons/jwt.svg';

	properties: INodeProperties[] = [
		{
			displayName: 'Key Type',
			name: 'keyType',
			type: 'options',
			description: 'Choose either the secret passphrase or PEM encoded public keys',
			options: [
				{
					name: 'Passphrase',
					value: 'passphrase',
				},
				{
					name: 'PEM Key',
					value: 'pemKey',
				},
			],
			default: 'passphrase',
		},
		{
			displayName: 'Secret',
			name: 'secret',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			displayOptions: {
				show: {
					keyType: ['passphrase'],
				},
			},
		},
		{
			displayName: 'Private Key',
			name: 'privateKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					keyType: ['pemKey'],
				},
			},
			default: '',
		},
		{
			displayName: 'Public Key',
			name: 'publicKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			displayOptions: {
				show: {
					keyType: ['pemKey'],
				},
			},
			default: '',
		},
		{
			displayName: 'Algorithm',
			name: 'algorithm',
			type: 'options',
			default: 'HS256',
			options: algorithms,
		},
	];
}
