import type { INodeProperties } from 'n8n-workflow';

export const certificateOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a certificate',
				action: 'Delete a certificate',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a certificate',
				action: 'Get a certificate',
			},
			{
				name: 'Get Many',
				value: 'getMany',
				description: 'Get many certificates',
				action: 'Get many certificates',
			},
			{
				name: 'Get Metadata',
				value: 'getMetadata',
				description: 'Get certificate metadata',
				action: 'Get certificate metadata',
			},
			{
				name: 'Renew',
				value: 'renew',
				description: 'Renew a certificate',
				action: 'Renew a certificate',
			},
		],
		default: 'renew',
	},
];

export const certificateFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                certificate:renew                           */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Certificate ARN',
		name: 'certificateArn',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['renew', 'get', 'delete', 'getMetadata'],
			},
		},
		description:
			'String that contains the ARN of the ACM certificate to be renewed. This must be of the form: arn:aws:acm:region:123456789012:certificate/12345678-1234-1234-1234-123456789012.',
	},
	/* -------------------------------------------------------------------------- */
	/*                                certificate:delete                          */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['delete'],
			},
		},
	},
	{
		displayName: 'Certificate Key',
		name: 'certificateKey',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['delete'],
			},
		},
	},
	/* -------------------------------------------------------------------------- */
	/*                                 certificate:getMany                         */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getMany'],
				resource: ['certificate'],
			},
		},
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: ['getMany'],
				resource: ['certificate'],
				returnAll: [false],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['getMany'],
			},
		},
		options: [
			{
				displayName: 'Certificate Statuses',
				name: 'certificateStatuses',
				type: 'multiOptions',
				options: [
					{
						name: 'Expired',
						value: 'EXPIRED',
					},
					{
						name: 'Failed',
						value: 'FAILED',
					},
					{
						name: 'Inactive',
						value: 'INACTIVE',
					},
					{
						name: 'Issued',
						value: 'ISSUED',
					},
					{
						name: 'Pending Validation',
						value: 'PENDING_VALIDATION',
					},
					{
						name: 'Revoked',
						value: 'REVOKED',
					},
					{
						name: 'Validation Timed Out',
						value: 'VALIDATION_TIMED_OUT',
					},
				],
				default: [],
				description: 'Filter the certificate list by status value',
			},
			{
				displayName: 'Extended Key Usage',
				name: 'extendedKeyUsage',
				type: 'multiOptions',
				options: [
					{
						name: 'Any',
						value: 'ANY',
					},
					{
						name: 'Code Signing',
						value: 'CODE_SIGNING',
					},
					{
						name: 'Custom',
						value: 'CUSTOM',
					},
					{
						name: 'Email Protection',
						value: 'EMAIL_PROTECTION',
					},
					{
						name: 'IPSEC End System',
						value: 'IPSEC_END_SYSTEM',
					},
					{
						name: 'IPSEC Tunnel',
						value: 'IPSEC_TUNNEL',
					},
					{
						name: 'IPSEC User',
						value: 'IPSEC_USER',
					},
					{
						name: 'None',
						value: 'NONE',
					},
					{
						name: 'OCSP Signing',
						value: 'OCSP_SIGNING',
					},
					{
						name: 'Time Stamping',
						value: 'TIME_STAMPING',
					},
					{
						name: 'TLS Web Client Authentication',
						value: 'TLS_WEB_CLIENT_AUTHENTICATION',
					},
					{
						name: 'TLS Web Server Authentication',
						value: 'TLS_WEB_SERVER_AUTHENTICATION',
					},
				],
				default: [],
				description: 'Specify one or more ExtendedKeyUsage extension values',
			},
			{
				displayName: 'Key Types',
				name: 'keyTypes',
				type: 'multiOptions',
				options: [
					{
						name: 'EC Prime256v1',
						value: 'EC_prime256v1',
					},
					{
						name: 'EC Secp384r1',
						value: 'EC_secp384r1',
					},
					{
						name: 'EC Secp521r1',
						value: 'EC_secp521r1',
					},
					{
						name: 'RSA 1024',
						value: 'RSA_1024',
					},
					{
						name: 'RSA 2048',
						value: 'RSA_2048',
					},
					{
						name: 'RSA 4096',
						value: 'RSA_4096',
					},
				],
				default: ['RSA_2048'],
				description: 'Specify one or more algorithms that can be used to generate key pairs',
			},
			{
				displayName: 'Key Usage',
				name: 'keyUsage',
				type: 'multiOptions',
				options: [
					{
						name: 'Any',
						value: 'ANY',
					},
					{
						name: 'Certificate Signing',
						value: 'CERTIFICATE_SIGNING',
					},
					{
						name: 'CRL Signing',
						value: 'CRL_SIGNING',
					},
					{
						name: 'Custom',
						value: 'CUSTOM',
					},
					{
						name: 'Data Encipherment',
						value: 'DATA_ENCIPHERMENT',
					},
					{
						name: 'Decipher Only',
						value: 'DECIPHER_ONLY',
					},
					{
						name: 'Digital Signature',
						value: 'DIGITAL_SIGNATURE',
					},
					{
						name: 'Encipher Only',
						value: 'ENCIPHER_ONLY',
					},
					{
						name: 'Key Agreement',
						value: 'KEY_AGREEMENT',
					},
					{
						name: 'Key Encipherment',
						value: 'KEY_ENCIPHERMENT',
					},
					{
						name: 'Non Repudiation',
						value: 'NON_REPUDIATION',
					},
				],
				default: [],
				description: 'Specify one or more KeyUsage extension values',
			},
		],
	},
];
