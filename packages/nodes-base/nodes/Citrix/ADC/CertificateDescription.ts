import { INodeProperties } from 'n8n-workflow';

export const certificateDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a certificate',
			},
		],
		default: 'create',
		displayOptions: {
			show: {
				resource: ['certificate'],
			},
		},
	},
	{
		displayName: 'Certificate File Name',
		name: 'certificateFileName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
			},
		},
		default: '',
		description:
			'Name for and, optionally, path to the generated certificate file. /nsconfig/ssl/ is the default path.',
	},
	{
		displayName: 'Certificate Format',
		name: 'certificateFormat',
		type: 'options',
		options: [
			{
				name: 'PEM',
				value: 'PEM',
			},
			{
				name: 'DER',
				value: 'DER',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
			},
		},
		default: 'PEM',
		description: 'Format in which the certificate is stored on the appliance',
	},
	{
		displayName: 'Certificate Type',
		name: 'certificateType',
		type: 'options',
		options: [
			{
				name: 'Root-CA',
				value: 'ROOT_CERT',
				description:
					'You must specify the key file name. The generated Root-CA certificate can be used for signing end-user client or server certificates or to create Intermediate-CA certificates.',
			},
			{
				name: 'Intermediate-CA',
				value: 'INTM_CERT',
				description: 'Intermediate-CA certificate',
			},
			{
				name: 'Server',
				value: 'SRVR_CERT',
				description: 'SSL server certificate used on SSL servers for end-to-end encryption',
			},
			{
				name: 'Client',
				value: 'CLNT_CERT',
				description: 'End-user client certificate used for client authentication',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
			},
		},
		default: 'ROOT_CERT',
	},
	{
		displayName: 'Certificate Request File Name',
		name: 'certificateRequestFileName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['certificate'],
			},
		},
		description:
			'Name for and, optionally, path to the certificate-signing request (CSR). /nsconfig/ssl/ is the default path.',
	},
	{
		displayName: 'CA Certificate File Name',
		name: 'caCertificateFileName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['INTM_CERT', 'SRVR_CERT', 'CLNT_CERT'],
			},
		},
		default: '',
		description:
			'Name of the CA certificate file that issues and signs the Intermediate-CA certificate or the end-user client and server certificates',
	},
	{
		displayName: 'CA Certificate File Format',
		name: 'caCertificateFileFormat',
		type: 'options',
		options: [
			{
				name: 'PEM',
				value: 'PEM',
			},
			{
				name: 'DER',
				value: 'DER',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['INTM_CERT', 'SRVR_CERT', 'CLNT_CERT'],
			},
		},
		default: 'PEM',
		description: 'Format of the CA certificate',
	},
	{
		displayName: 'CA Private Key File Name',
		name: 'caPrivateKeyFileName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['INTM_CERT', 'SRVR_CERT', 'CLNT_CERT'],
			},
		},
		default: '',
		description:
			'Private key, associated with the CA certificate that is used to sign the Intermediate-CA certificate or the end-user client and server certificate. If the CA key file is password protected, the user is prompted to enter the pass phrase that was used to encrypt the key.',
	},
	{
		displayName: 'CA Private Key File Format',
		name: 'caPrivateKeyFileFormat',
		type: 'options',
		options: [
			{
				name: 'PEM',
				value: 'PEM',
			},
			{
				name: 'DER',
				value: 'DER',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['INTM_CERT', 'SRVR_CERT', 'CLNT_CERT'],
			},
		},
		default: 'PEM',
		description: 'Format of the CA certificate',
	},
	{
		displayName: 'Private Key File Name',
		name: 'privateKeyFileName',
		type: 'string',
		default: '',
		required: true,
		displayOptions: {
			show: {
				operation: ['create'],
				resource: ['certificate'],
				certificateType: ['ROOT_CERT'],
			},
		},
		description:
			'Name for and, optionally, path to the private key. You can either use an existing RSA or DSA key that you own or create a new private key on the Citrix ADC. This file is required only when creating a self-signed Root-CA certificate. The key file is stored in the /nsconfig/ssl directory by default.',
	},
	{
		displayName: 'CA Serial File Number',
		name: 'caSerialFileNumber',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['INTM_CERT', 'SRVR_CERT', 'CLNT_CERT'],
			},
		},
		default: '',
		description: 'Serial number file maintained for the CA certificate. This file contains the serial number of the next certificate to be issued or signed by the CA.',
	},
	{
		displayName: 'Private Key Format',
		name: 'privateKeyFormat',
		type: 'options',
		options: [
			{
				name: 'PEM',
				value: 'PEM',
			},
			{
				name: 'DER',
				value: 'DER',
			},
		],
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
				certificateType: ['ROOT_CERT'],
			},
		},
		default: 'PEM',
		description: 'Format in which the key is stored on the appliance',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'PEM Passphrase (For Encrypted Key)',
				name: 'pempassphrase',
				type: 'string',
				displayOptions: {
					show: {
						'/certificateType': ['ROOT_CERT'],
					},
				},
				default: '',
				description:
					'Name for and, optionally, path to the private key. You can either use an existing RSA or DSA key that you own or create a new private key on the Citrix ADC. This file is required only when creating a self-signed Root-CA certificate. The key file is stored in the /nsconfig/ssl directory by default.',
			},
			{
				displayName: 'PEM Passphrase (For Encrypted CA Key)',
				name: 'pempassphrase',
				type: 'string',
				displayOptions: {
					hide: {
						'/certificateType': ['ROOT_CERT'],
					},
				},
				default: '',
				description:
					'Name for and, optionally, path to the private key. You can either use an existing RSA or DSA key that you own or create a new private key on the Citrix ADC. This file is required only when creating a self-signed Root-CA certificate. The key file is stored in the /nsconfig/ssl directory by default.',
			},
			{
				displayName: 'Subject Alternative Name',
				name: 'subjectaltname',
				type: 'string',
				default: '',
				description:
					'Subject Alternative Name (SAN) is an extension to X.509 that allows various values to be associated with a security certificate using a subjectAltName field',
			},
			{
				displayName: 'Validity Period (Number of Days)',
				name: 'days',
				type: 'string',
				default: '',
				description:
					'Number of days for which the certificate will be valid, beginning with the time and day (system time) of creation',
			},
		],
	},
];
