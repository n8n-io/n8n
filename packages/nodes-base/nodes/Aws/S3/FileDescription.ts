import { INodeProperties } from 'n8n-workflow';

export const fileOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['file'],
			},
		},
		options: [
			{
				name: 'Copy',
				value: 'copy',
				description: 'Copy a file',
				action: 'Copy a file',
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a file',
				action: 'Delete a file',
			},
			{
				name: 'Download',
				value: 'download',
				description: 'Download a file',
				action: 'Download a file',
			},
			{
				name: 'Get All',
				value: 'getAll',
				description: 'Get all files',
				action: 'Get all files',
			},
			{
				name: 'Upload',
				value: 'upload',
				description: 'Upload a file',
				action: 'Upload a file',
			},
		],
		default: 'download',
	},
];

export const fileFields: INodeProperties[] = [
	/* -------------------------------------------------------------------------- */
	/*                                file:copy                                   */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Source Path',
		name: 'sourcePath',
		type: 'string',
		required: true,
		default: '',
		placeholder: '/bucket/my-image.jpg',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['copy'],
			},
		},
		description:
			'The name of the source bucket and key name of the source object, separated by a slash (/)',
	},
	{
		displayName: 'Destination Path',
		name: 'destinationPath',
		type: 'string',
		required: true,
		default: '',
		placeholder: '/bucket/my-second-image.jpg',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['copy'],
			},
		},
		description:
			'The name of the destination bucket and key name of the destination object, separated by a slash (/)',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['copy'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'ACL',
				name: 'acl',
				type: 'options',
				options: [
					{
						name: 'Authenticated Read',
						value: 'authenticatedRead',
					},
					{
						name: 'AWS Exec Read',
						value: 'awsExecRead',
					},
					{
						name: 'Bucket Owner Full Control',
						value: 'bucketOwnerFullControl',
					},
					{
						name: 'Bucket Owner Read',
						value: 'bucketOwnerRead',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Public Read',
						value: 'publicRead',
					},
					{
						name: 'Public Read Write',
						value: 'publicReadWrite',
					},
				],
				default: 'private',
				description: 'The canned ACL to apply to the object',
			},
			{
				displayName: 'Grant Full Control',
				name: 'grantFullControl',
				type: 'boolean',
				default: false,
				description:
					'Whether to give the grantee READ, READ_ACP, and WRITE_ACP permissions on the object',
			},
			{
				displayName: 'Grant Read',
				name: 'grantRead',
				type: 'boolean',
				default: false,
				description: 'Whether to allow grantee to read the object data and its metadata',
			},
			{
				displayName: 'Grant Read ACP',
				name: 'grantReadAcp',
				type: 'boolean',
				default: false,
				description: 'Whether to allow grantee to read the object ACL',
			},
			{
				displayName: 'Grant Write ACP',
				name: 'grantWriteAcp',
				type: 'boolean',
				default: false,
				description: 'Whether to allow grantee to write the ACL for the applicable object',
			},
			{
				displayName: 'Lock Legal Hold',
				name: 'lockLegalHold',
				type: 'boolean',
				default: false,
				description: 'Whether a legal hold will be applied to this object',
			},
			{
				displayName: 'Lock Mode',
				name: 'lockMode',
				type: 'options',
				options: [
					{
						name: 'Governance',
						value: 'governance',
					},
					{
						name: 'Compliance',
						value: 'compliance',
					},
				],
				default: '',
				description: 'The Object Lock mode that you want to apply to this object',
			},
			{
				displayName: 'Lock Retain Until Date',
				name: 'lockRetainUntilDate',
				type: 'dateTime',
				default: '',
				description: "The date and time when you want this object's Object Lock to expire",
			},
			{
				displayName: 'Metadata Directive',
				name: 'metadataDirective',
				type: 'options',
				options: [
					{
						name: 'Copy',
						value: 'copy',
					},
					{
						name: 'Replace',
						value: 'replace',
					},
				],
				default: '',
				description:
					'Specifies whether the metadata is copied from the source object or replaced with metadata provided in the request',
			},
			{
				displayName: 'Requester Pays',
				name: 'requesterPays',
				type: 'boolean',
				default: false,
				description:
					'Whether the requester will pay for requests and data transfer. While Requester Pays is enabled, anonymous access to this bucket is disabled.',
			},
			{
				displayName: 'Server Side Encryption',
				name: 'serverSideEncryption',
				type: 'options',
				options: [
					{
						name: 'AES256',
						value: 'AES256',
					},
					{
						name: 'AWS:KMS',
						value: 'aws:kms',
					},
				],
				default: '',
				description:
					'The server-side encryption algorithm used when storing this object in Amazon S3',
			},
			{
				displayName: 'Server Side Encryption Context',
				name: 'serverSideEncryptionContext',
				type: 'string',
				default: '',
				description: 'Specifies the AWS KMS Encryption Context to use for object encryption',
			},
			{
				displayName: 'Server Side Encryption AWS KMS Key ID',
				name: 'encryptionAwsKmsKeyId',
				type: 'string',
				default: '',
				description: 'If x-amz-server-side-encryption is present and has the value of aws:kms',
			},
			{
				displayName: 'Server Side Encryption Customer Algorithm',
				name: 'serversideEncryptionCustomerAlgorithm',
				type: 'string',
				default: '',
				description:
					'Specifies the algorithm to use to when encrypting the object (for example, AES256)',
			},
			{
				displayName: 'Server Side Encryption Customer Key',
				name: 'serversideEncryptionCustomerKey',
				type: 'string',
				default: '',
				description:
					'Specifies the customer-provided encryption key for Amazon S3 to use in encrypting data',
			},
			{
				displayName: 'Server Side Encryption Customer Key MD5',
				name: 'serversideEncryptionCustomerKeyMD5',
				type: 'string',
				default: '',
				description: 'Specifies the 128-bit MD5 digest of the encryption key according to RFC 1321',
			},
			{
				displayName: 'Storage Class',
				name: 'storageClass',
				type: 'options',
				options: [
					{
						name: 'Deep Archive',
						value: 'deepArchive',
					},
					{
						name: 'Glacier',
						value: 'glacier',
					},
					{
						name: 'Intelligent Tiering',
						value: 'intelligentTiering',
					},
					{
						name: 'One Zone IA',
						value: 'onezoneIA',
					},
					{
						name: 'Standard',
						value: 'standard',
					},
					{
						name: 'Standard IA',
						value: 'standardIA',
					},
				],
				default: 'standard',
				description: 'Amazon S3 storage classes',
			},
			{
				displayName: 'Tagging Directive',
				name: 'taggingDirective',
				type: 'options',
				options: [
					{
						name: 'Copy',
						value: 'copy',
					},
					{
						name: 'Replace',
						value: 'replace',
					},
				],
				default: '',
				description:
					'Specifies whether the metadata is copied from the source object or replaced with metadata provided in the request',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                file:upload                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		placeholder: 'hello.txt',
		required: true,
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
				binaryData: [false],
			},
		},
	},
	{
		displayName: 'File Name',
		name: 'fileName',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
				binaryData: [true],
			},
		},
		description: 'If not set the binary data filename will be used',
	},
	{
		displayName: 'Binary Data',
		name: 'binaryData',
		type: 'boolean',
		default: true,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['file'],
			},
		},
		description: 'Whether the data to upload should be taken from binary field',
	},
	{
		displayName: 'File Content',
		name: 'fileContent',
		type: 'string',
		default: '',
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['file'],
				binaryData: [false],
			},
		},
		placeholder: '',
		description: 'The text content of the file to upload',
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		default: 'data',
		required: true,
		displayOptions: {
			show: {
				operation: ['upload'],
				resource: ['file'],
				binaryData: [true],
			},
		},
		placeholder: '',
		description: 'Name of the binary property which contains the data for the file to be uploaded',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
		default: {},
		options: [
			{
				displayName: 'ACL',
				name: 'acl',
				type: 'options',
				options: [
					{
						name: 'Authenticated Read',
						value: 'authenticatedRead',
					},
					{
						name: 'AWS Exec Read',
						value: 'awsExecRead',
					},
					{
						name: 'Bucket Owner Full Control',
						value: 'bucketOwnerFullControl',
					},
					{
						name: 'Bucket Owner Read',
						value: 'bucketOwnerRead',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Public Read',
						value: 'publicRead',
					},
					{
						name: 'Public Read Write',
						value: 'publicReadWrite',
					},
				],
				default: 'private',
				description: 'The canned ACL to apply to the object',
			},
			{
				displayName: 'Grant Full Control',
				name: 'grantFullControl',
				type: 'boolean',
				default: false,
				description:
					'Whether to give the grantee READ, READ_ACP, and WRITE_ACP permissions on the object',
			},
			{
				displayName: 'Grant Read',
				name: 'grantRead',
				type: 'boolean',
				default: false,
				description: 'Whether to allow grantee to read the object data and its metadata',
			},
			{
				displayName: 'Grant Read ACP',
				name: 'grantReadAcp',
				type: 'boolean',
				default: false,
				description: 'Whether to allow grantee to read the object ACL',
			},
			{
				displayName: 'Grant Write ACP',
				name: 'grantWriteAcp',
				type: 'boolean',
				default: false,
				description: 'Whether to allow grantee to write the ACL for the applicable object',
			},
			{
				displayName: 'Lock Legal Hold',
				name: 'lockLegalHold',
				type: 'boolean',
				default: false,
				description: 'Whether a legal hold will be applied to this object',
			},
			{
				displayName: 'Lock Mode',
				name: 'lockMode',
				type: 'options',
				options: [
					{
						name: 'Governance',
						value: 'governance',
					},
					{
						name: 'Compliance',
						value: 'compliance',
					},
				],
				default: '',
				description: 'The Object Lock mode that you want to apply to this object',
			},
			{
				displayName: 'Lock Retain Until Date',
				name: 'lockRetainUntilDate',
				type: 'dateTime',
				default: '',
				description: "The date and time when you want this object's Object Lock to expire",
			},
			{
				displayName: 'Parent Folder Key',
				name: 'parentFolderKey',
				type: 'string',
				default: '',
				description: 'Parent file you want to create the file in',
			},
			{
				displayName: 'Requester Pays',
				name: 'requesterPays',
				type: 'boolean',
				default: false,
				description:
					'Whether the requester will pay for requests and data transfer. While Requester Pays is enabled, anonymous access to this bucket is disabled.',
			},
			{
				displayName: 'Server Side Encryption',
				name: 'serverSideEncryption',
				type: 'options',
				options: [
					{
						name: 'AES256',
						value: 'AES256',
					},
					{
						name: 'AWS:KMS',
						value: 'aws:kms',
					},
				],
				default: '',
				description:
					'The server-side encryption algorithm used when storing this object in Amazon S3',
			},
			{
				displayName: 'Server Side Encryption Context',
				name: 'serverSideEncryptionContext',
				type: 'string',
				default: '',
				description: 'Specifies the AWS KMS Encryption Context to use for object encryption',
			},
			{
				displayName: 'Server Side Encryption AWS KMS Key ID',
				name: 'encryptionAwsKmsKeyId',
				type: 'string',
				default: '',
				description: 'If x-amz-server-side-encryption is present and has the value of aws:kms',
			},
			{
				displayName: 'Server Side Encryption Customer Algorithm',
				name: 'serversideEncryptionCustomerAlgorithm',
				type: 'string',
				default: '',
				description:
					'Specifies the algorithm to use to when encrypting the object (for example, AES256)',
			},
			{
				displayName: 'Server Side Encryption Customer Key',
				name: 'serversideEncryptionCustomerKey',
				type: 'string',
				default: '',
				description:
					'Specifies the customer-provided encryption key for Amazon S3 to use in encrypting data',
			},
			{
				displayName: 'Server Side Encryption Customer Key MD5',
				name: 'serversideEncryptionCustomerKeyMD5',
				type: 'string',
				default: '',
				description: 'Specifies the 128-bit MD5 digest of the encryption key according to RFC 1321',
			},
			{
				displayName: 'Storage Class',
				name: 'storageClass',
				type: 'options',
				options: [
					{
						name: 'Deep Archive',
						value: 'deepArchive',
					},
					{
						name: 'Glacier',
						value: 'glacier',
					},
					{
						name: 'Intelligent Tiering',
						value: 'intelligentTiering',
					},
					{
						name: 'One Zone IA',
						value: 'onezoneIA',
					},
					{
						name: 'Standard',
						value: 'standard',
					},
					{
						name: 'Standard IA',
						value: 'standardIA',
					},
				],
				default: 'standard',
				description: 'Amazon S3 storage classes',
			},
		],
	},
	{
		displayName: 'Tags',
		name: 'tagsUi',
		placeholder: 'Add Tag',
		type: 'fixedCollection',
		default: {},
		typeOptions: {
			multipleValues: true,
		},
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['upload'],
			},
		},
		options: [
			{
				name: 'tagsValues',
				displayName: 'Tag',
				values: [
					{
						displayName: 'Key',
						name: 'key',
						type: 'string',
						default: '',
					},
					{
						displayName: 'Value',
						name: 'value',
						type: 'string',
						default: '',
					},
				],
			},
		],
		description: 'Optional extra headers to add to the message (most headers are allowed)',
	},
	/* -------------------------------------------------------------------------- */
	/*                                file:download                               */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download'],
			},
		},
	},
	{
		displayName: 'File Key',
		name: 'fileKey',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['download'],
			},
		},
	},
	{
		displayName: 'Binary Property',
		name: 'binaryPropertyName',
		type: 'string',
		required: true,
		default: 'data',
		displayOptions: {
			show: {
				operation: ['download'],
				resource: ['file'],
			},
		},
		description: 'Name of the binary property to which to write the data of the read file',
	},
	/* -------------------------------------------------------------------------- */
	/*                                file:delete                                 */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['delete'],
			},
		},
	},
	{
		displayName: 'File Key',
		name: 'fileKey',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['delete'],
			},
		},
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['delete'],
			},
		},
		options: [
			{
				displayName: 'Version ID',
				name: 'versionId',
				type: 'string',
				default: '',
			},
		],
	},
	/* -------------------------------------------------------------------------- */
	/*                                 file:getAll                                */
	/* -------------------------------------------------------------------------- */
	{
		displayName: 'Bucket Name',
		name: 'bucketName',
		type: 'string',
		required: true,
		default: '',
		displayOptions: {
			show: {
				resource: ['file'],
				operation: ['getAll'],
			},
		},
	},
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: {
			show: {
				operation: ['getAll'],
				resource: ['file'],
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
				operation: ['getAll'],
				resource: ['file'],
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
				resource: ['file'],
				operation: ['getAll'],
			},
		},
		options: [
			{
				displayName: 'Fetch Owner',
				name: 'fetchOwner',
				type: 'boolean',
				default: false,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'The owner field is not present in listV2 by default, if you want to return owner field with each key in the result then set the fetch owner field to true',
			},
			{
				displayName: 'Folder Key',
				name: 'folderKey',
				type: 'string',
				default: '',
			},
		],
	},
];
