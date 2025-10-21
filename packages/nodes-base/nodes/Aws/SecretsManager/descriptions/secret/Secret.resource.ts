import type { INodeProperties } from 'n8n-workflow';

export const secretOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['secret'],
			},
		},
		options: [
			{
				name: 'Create',
				value: 'create',
				description: 'Create a new secret',
				action: 'Create a secret',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'secretsmanager.CreateSecret',
						},
						body: {
							Name: '={{ $parameter["secretName"] }}',
							SecretString: '={{ $parameter["secretString"] }}',
						},
					},
				},
			},
			{
				name: 'Delete',
				value: 'delete',
				description: 'Delete a secret',
				action: 'Delete a secret',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'secretsmanager.DeleteSecret',
						},
						body: {
							SecretId: '={{ $parameter["secretId"] }}',
						},
					},
				},
			},
			{
				name: 'Describe',
				value: 'describe',
				description: 'Get metadata about a secret',
				action: 'Describe a secret',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'secretsmanager.DescribeSecret',
						},
						body: {
							SecretId: '={{ $parameter["secretId"] }}',
						},
					},
				},
			},
			{
				name: 'Get Value',
				value: 'getValue',
				description: 'Retrieve the value of a secret',
				action: 'Get secret value',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'secretsmanager.GetSecretValue',
						},
						body: {
							SecretId: '={{ $parameter["secretId"] }}',
						},
					},
				},
			},
			{
				name: 'List',
				value: 'list',
				description: 'List all secrets',
				action: 'List secrets',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'secretsmanager.ListSecrets',
						},
						body: {},
					},
				},
			},
			{
				name: 'Put Value',
				value: 'putValue',
				description: 'Store a new value in an existing secret',
				action: 'Put secret value',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'secretsmanager.PutSecretValue',
						},
						body: {
							SecretId: '={{ $parameter["secretId"] }}',
							SecretString: '={{ $parameter["secretString"] }}',
						},
					},
				},
			},
			{
				name: 'Restore',
				value: 'restore',
				description: 'Restore a deleted secret',
				action: 'Restore a secret',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'secretsmanager.RestoreSecret',
						},
						body: {
							SecretId: '={{ $parameter["secretId"] }}',
						},
					},
				},
			},
			{
				name: 'Rotate',
				value: 'rotate',
				description: 'Rotate a secret',
				action: 'Rotate a secret',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'secretsmanager.RotateSecret',
						},
						body: {
							SecretId: '={{ $parameter["secretId"] }}',
						},
					},
				},
			},
			{
				name: 'Update',
				value: 'update',
				description: 'Update secret metadata',
				action: 'Update a secret',
				routing: {
					request: {
						method: 'POST',
						headers: {
							'X-Amz-Target': 'secretsmanager.UpdateSecret',
						},
						body: {
							SecretId: '={{ $parameter["secretId"] }}',
						},
					},
				},
			},
		],
		default: 'list',
	},
];

export const secretFields: INodeProperties[] = [
	{
		displayName: 'Secret Name',
		name: 'secretName',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['create'],
			},
		},
		default: '',
		description: 'The name of the new secret',
	},
	{
		displayName: 'Secret ID',
		name: 'secretId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['delete', 'describe', 'getValue', 'putValue', 'restore', 'rotate', 'update'],
			},
		},
		default: '',
		description: 'The ARN or name of the secret',
	},
	{
		displayName: 'Secret String',
		name: 'secretString',
		type: 'string',
		typeOptions: {
			password: true,
		},
		required: true,
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['create', 'putValue'],
			},
		},
		default: '',
		description: 'The secret value (text or JSON)',
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['secret'],
				operation: ['create'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
				description: 'Description of the secret',
			},
			{
				displayName: 'KMS Key ID',
				name: 'KmsKeyId',
				type: 'string',
				default: '',
				description: 'KMS key to use for encryption',
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
				resource: ['secret'],
				operation: ['delete'],
			},
		},
		options: [
			{
				displayName: 'Force Delete Without Recovery',
				name: 'ForceDeleteWithoutRecovery',
				type: 'boolean',
				default: false,
				description: 'Whether to delete immediately without recovery window',
			},
			{
				displayName: 'Recovery Window In Days',
				name: 'RecoveryWindowInDays',
				type: 'number',
				default: 30,
				description: 'Number of days to retain the secret (7-30)',
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
				resource: ['secret'],
				operation: ['getValue'],
			},
		},
		options: [
			{
				displayName: 'Version ID',
				name: 'VersionId',
				type: 'string',
				default: '',
				description: 'Specific version of the secret to retrieve',
			},
			{
				displayName: 'Version Stage',
				name: 'VersionStage',
				type: 'string',
				default: '',
				description: 'Version stage (e.g., AWSCURRENT, AWSPENDING)',
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
				resource: ['secret'],
				operation: ['list'],
			},
		},
		options: [
			{
				displayName: 'Max Results',
				name: 'MaxResults',
				type: 'number',
				default: 100,
				description: 'Maximum number of results to return',
			},
			{
				displayName: 'Next Token',
				name: 'NextToken',
				type: 'string',
				default: '',
				description: 'Token for pagination',
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
				resource: ['secret'],
				operation: ['putValue'],
			},
		},
		options: [
			{
				displayName: 'Version Stages',
				name: 'VersionStages',
				type: 'string',
				default: '',
				description: 'Version stages as JSON array (e.g., ["AWSCURRENT"])',
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
				resource: ['secret'],
				operation: ['rotate'],
			},
		},
		options: [
			{
				displayName: 'Rotation Lambda ARN',
				name: 'RotationLambdaARN',
				type: 'string',
				default: '',
				description: 'ARN of the Lambda function for rotation',
			},
			{
				displayName: 'Rotation Rules',
				name: 'RotationRules',
				type: 'string',
				default: '',
				description: 'Rotation rules as JSON (e.g., {"AutomaticallyAfterDays":30})',
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
				resource: ['secret'],
				operation: ['update'],
			},
		},
		options: [
			{
				displayName: 'Description',
				name: 'Description',
				type: 'string',
				default: '',
				description: 'New description for the secret',
			},
			{
				displayName: 'KMS Key ID',
				name: 'KmsKeyId',
				type: 'string',
				default: '',
				description: 'New KMS key for encryption',
			},
			{
				displayName: 'Secret String',
				name: 'SecretString',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description: 'New secret value',
			},
		],
	},
];
