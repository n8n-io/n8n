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
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'CertificateManager.DeleteCertificate',
						},
						body: {
							CertificateArn: '={{ $parameter["certificateArn"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get details about a certificate',
				action: 'Describe a certificate',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'CertificateManager.DescribeCertificate',
						},
						body: {
							CertificateArn: '={{ $parameter["certificateArn"] }}',
						},
					},
				},
			},
			{
				name: 'Export',
				value: 'export',
				description: 'Export a certificate',
				action: 'Export a certificate',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'CertificateManager.ExportCertificate',
						},
						body: {
							CertificateArn: '={{ $parameter["certificateArn"] }}',
							Passphrase: '={{ $parameter["passphrase"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all certificates',
				action: 'List certificates',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'CertificateManager.ListCertificates',
						},
						body: {},
					},
				},
			},
			{
				name: 'Request',
				value: 'request',
				description: 'Request a new certificate',
				action: 'Request a certificate',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'CertificateManager.RequestCertificate',
						},
						body: {
							DomainName: '={{ $parameter["domainName"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const certificateFields: INodeProperties[] = [
	{
		displayName: 'Certificate ARN',
		name: 'certificateArn',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['delete', 'describe', 'export'],
			},
		},
		default: '',
		description: 'The ARN of the certificate',
	},
	{
		displayName: 'Domain Name',
		name: 'domainName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['request'],
			},
		},
		default: '',
		description: 'The fully qualified domain name (e.g., example.com)',
		placeholder: 'example.com',
	},
	{
		displayName: 'Passphrase',
		name: 'passphrase',
		type: 'string',
		typeOptions: {
			password: true,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['certificate'],
				operation: ['export'],
			},
		},
		default: '',
		description: 'Passphrase to encrypt the private key (base64 encoded)',
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
				operation: ['request'],
			},
		},
		options: [
			{
				displayName: 'Subject Alternative Names',
				name: 'SubjectAlternativeNames',
				type: 'string',
				default: '',
				description: 'Comma-separated list of additional domain names (e.g., www.example.com,*.example.com)',
			},
			{
				displayName: 'Validation Method',
				name: 'ValidationMethod',
				type: 'options',
				options: [
					{ name: 'DNS', value: 'DNS' },
					{ name: 'Email', value: 'EMAIL' },
				],
				default: 'DNS',
				description: 'Method to validate domain ownership',
			},
			{
				displayName: 'Tags',
				name: 'Tags',
				type: 'string',
				default: '',
				description: 'Tags as JSON array (e.g., [{"Key":"Environment","Value":"Production"}])',
			},
		],
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
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Max Items',
				name: 'MaxItems',
				type: 'number',
				default: 1000,
				description: 'Maximum number of items to return',
			},
			{
				displayName: 'Next Token',
				name: 'NextToken',
				type: 'string',
				default: '',
				description: 'Token for pagination',
			},
			{
				displayName: 'Certificate Statuses',
				name: 'CertificateStatuses',
				type: 'string',
				default: '',
				description: 'Comma-separated list of statuses to filter (ISSUED,PENDING_VALIDATION,EXPIRED,etc.)',
			},
		],
	},
];
