import type { ICredentialType } from 'n8n-workflow';

/** Mirrors the Postgres credential: a toggle controls `ssl`, and `ssl` controls the secrets. */
export const postgresLikeCredentialType: ICredentialType = {
	name: 'postgres',
	displayName: 'Postgres',
	properties: [
		{ displayName: 'Host', name: 'host', type: 'string', default: '' },
		{
			displayName: 'Password',
			name: 'password',
			type: 'string',
			typeOptions: { password: true },
			default: '',
		},
		{
			displayName: 'Allow Unauthorized Certs',
			name: 'allowUnauthorizedCerts',
			type: 'boolean',
			default: false,
		},
		{
			displayName: 'SSL',
			name: 'ssl',
			type: 'options',
			options: [
				{ name: 'Allow', value: 'allow' },
				{ name: 'Disable', value: 'disable' },
				{ name: 'Require', value: 'require' },
			],
			displayOptions: { show: { allowUnauthorizedCerts: [false] } },
			default: 'disable',
		},
		{
			displayName: 'CA Certificate',
			name: 'caCertificate',
			type: 'string',
			typeOptions: { password: true },
			displayOptions: { show: { ssl: ['allow', 'require'] } },
			default: '',
		},
	],
};
