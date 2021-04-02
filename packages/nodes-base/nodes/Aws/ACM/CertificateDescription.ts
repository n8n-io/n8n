import {
	INodeProperties,
} from 'n8n-workflow';

export const certificateOperations = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		displayOptions: {
			show: {
				resource: [
					'certificate',
				],
			},
		},
		options: [
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a certificate',
			},
			{
				name: 'Get',
				value: 'get',
				description: 'Get a certificate',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all certificates',
			},
			{
				name: 'Metadata',
				value: 'metadata',
				description: 'Get certificate metadata',
			},
			{
				name: 'Renew',
				value: 'renew',
				description: 'Renew a certificate',
			},
		],
		default: 'renew',
		description: 'The operation to perform.',
	},
] as INodeProperties[];

export const certificateFields = [

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
				resource: [
					'certificate',
				],
				operation: [
					'renew',
					'get',
					'delete',
					'metadata',
				],
			},
		},
		description: `String that contains the ARN of the ACM certificate to be renewed. </br>
		This must be of the form: arn:aws:acm:region:123456789012:certificate/12345678-1234-1234-1234-123456789012`,
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
				resource: [
					'certificate',
				],
				operation: [
					'delete',
				],
			},
		},
	},
	{
		displayName: 'certificate Key',
		name: 'certificateKey',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: [
					'certificate',
				],
				operation: [
					'delete',
				],
			},
		},
	},
/* -------------------------------------------------------------------------- */
/*                                 certificate:getAll                         */
/* -------------------------------------------------------------------------- */
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'certificate',
				],
			},
		},
		default: false,
		description: 'If all results should be returned or only up to a given limit.',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		displayOptions: {
			show: {
				operation: [
					'getAll',
				],
				resource: [
					'certificate',
				],
				returnAll: [
					false,
				],
			},
		},
		typeOptions: {
			minValue: 1,
			maxValue: 500,
		},
		default: 100,
		description: 'How many results to return.',
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: [
					'certificate',
				],
				operation: [
					'getAll',
				],
			},
		},
		options: [
			{
				displayName: 'Certificate Statuses',
				name: 'certificateStatuses',
				type: 'multiOptions',
				options: [
					{
						name: 'Pending Validation',
						value: 'PENDING_VALIDATION',
					},
					{
						name: 'Issued',
						value: 'ISSUED',
					},
					{
						name: 'Inactive',
						value: 'INACTIVE',
					},
					{
						name: 'Expired',
						value: 'EXPIRED',
					},
					{
						name: 'Validation Timed Out',
						value: 'VALIDATION_TIMED_OUT',
					},
					{
						name: 'Revoked',
						value: 'REVOKED',
					},
					{
						name: 'Failed',
						value: 'FAILED',
					},
				],
				default: [],
				description: 'Filter the certificate list by status value.',
			},
			{
				displayName: 'Extended Key Usage',
				name: 'extendedKeyUsage',
				type: 'multiOptions',
				options: [
					{
						name: 'TLS Web Server Authentication',
						value: 'TLS_WEB_SERVER_AUTHENTICATION',
					},
					{
						name: 'TLS Web Client Authentication',
						value: 'TLS_WEB_CLIENT_AUTHENTICATION',
					},
					{
						name: 'Code Signing',
						value: 'CODE_SIGNING',
					},
					{
						name: 'Email Protection',
						value: 'EMAIL_PROTECTION',
					},
					{
						name: 'Time Stamping',
						value: 'TIME_STAMPING',
					},
					{
						name: 'OCSP Signing',
						value: 'OCSP_SIGNING',
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
						name: 'Any',
						value: 'ANY',
					},
					{
						name: 'None',
						value: 'NONE',
					},
					{
						name: 'Custom',
						value: 'CUSTOM',
					},
				],
				default: [],
				description: 'Specify one or more ExtendedKeyUsage extension values.',
			},
			{
				displayName: 'Key Types',
				name: 'keyTypes',
				type: 'multiOptions',
				options: [
					{
						name: 'RSA 4096',
						value: 'RSA_4096',
					},
					{
						name: 'RSA 2048',
						value: 'RSA_2048',
					},
					{
						name: 'RSA 1024',
						value: 'RSA_1024',
					},
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
				],
				default: [
					'RSA_2048',
				],
				description: 'Specify one or more algorithms that can be used to generate key pairs.',
			},
			{
				displayName: 'Key Usage',
				name: 'keyUsage',
				type: 'multiOptions',
				options: [
					{
						name: 'Digital Signature',
						value: 'DIGITAL_SIGNATURE',
					},
					{
						name: 'Non Repudiation',
						value: 'NON_REPUDIATION',
					},
					{
						name: 'Key Encipherment',
						value: 'KEY_ENCIPHERMENT',
					},
					{
						name: 'Data Encipherment',
						value: 'DATA_ENCIPHERMENT',
					},
					{
						name: 'Key Agreement',
						value: 'KEY_AGREEMENT',
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
						name: 'Encipher Only',
						value: 'ENCIPHER_ONLY',
					},
					{
						name: 'Decipher Only',
						value: 'DECIPHER_ONLY',
					},
					{
						name: 'Any',
						value: 'ANY',
					},
					{
						name: 'Custom',
						value: 'CUSTOM',
					},
				],
				default: [],
				description: 'Specify one or more KeyUsage extension values.',
			},
		],
	},
] as INodeProperties[];
