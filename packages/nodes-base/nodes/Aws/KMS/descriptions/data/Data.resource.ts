import type { INodeProperties } from 'n8n-workflow';

export const dataOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: {
			show: {
				resource: ['data'],
			},
		},
		options: [
			{
				name: 'Decrypt',
				value: 'decrypt',
				description: 'Decrypt ciphertext',
				action: 'Decrypt data',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TrentService.Decrypt',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							CiphertextBlob: '={{ $parameter["ciphertextBlob"] }}',
						},
					},
				},
			},
			{
				name: 'Encrypt',
				value: 'encrypt',
				description: 'Encrypt plaintext',
				action: 'Encrypt data',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TrentService.Encrypt',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							KeyId: '={{ $parameter["keyId"] }}',
							Plaintext: '={{ $parameter["plaintext"] }}',
						},
					},
				},
			},
			{
				name: 'Generate Data Key',
				value: 'generateDataKey',
				description: 'Generate a data encryption key',
				action: 'Generate data key',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TrentService.GenerateDataKey',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							KeyId: '={{ $parameter["keyId"] }}',
						},
					},
				},
			},
			{
				name: 'Re-Encrypt',
				value: 'reEncrypt',
				description: 'Re-encrypt data with a different key',
				action: 'Re-encrypt data',
				routing: {
					request: {
						method: 'POST',
						url: '/',
						headers: {
							'X-Amz-Target': 'TrentService.ReEncrypt',
							'Content-Type': 'application/x-amz-json-1.1',
						},
						body: {
							CiphertextBlob: '={{ $parameter["ciphertextBlob"] }}',
							DestinationKeyId: '={{ $parameter["destinationKeyId"] }}',
						},
					},
				},
			},
		],
		default: 'encrypt',
	},
];

export const dataFields: INodeProperties[] = [
	// Encrypt fields
	{
		displayName: 'Key ID',
		name: 'keyId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['data'],
				operation: ['encrypt', 'generateDataKey'],
			},
		},
		default: '',
		description: 'The ID or ARN of the KMS key',
	},
	{
		displayName: 'Plaintext',
		name: 'plaintext',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['data'],
				operation: ['encrypt'],
			},
		},
		default: '',
		description: 'The plaintext data to encrypt (base64 encoded)',
	},
	// Decrypt fields
	{
		displayName: 'Ciphertext Blob',
		name: 'ciphertextBlob',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['data'],
				operation: ['decrypt', 'reEncrypt'],
			},
		},
		default: '',
		description: 'The encrypted data (base64 encoded)',
	},
	// Re-encrypt fields
	{
		displayName: 'Destination Key ID',
		name: 'destinationKeyId',
		type: 'string',
		required: true,
		displayOptions: {
			show: {
				resource: ['data'],
				operation: ['reEncrypt'],
			},
		},
		default: '',
		description: 'The ID or ARN of the destination KMS key',
	},
	// Generate data key fields
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['data'],
				operation: ['generateDataKey'],
			},
		},
		options: [
			{
				displayName: 'Key Spec',
				name: 'KeySpec',
				type: 'options',
				options: [
					{ name: 'AES 128', value: 'AES_128' },
					{ name: 'AES 256', value: 'AES_256' },
				],
				default: 'AES_256',
				description: 'Length of the data key',
			},
			{
				displayName: 'Number of Bytes',
				name: 'NumberOfBytes',
				type: 'number',
				default: 32,
				description: 'Length of the data key in bytes (1-1024)',
			},
		],
	},
	// Encrypt additional fields
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: {
			show: {
				resource: ['data'],
				operation: ['encrypt', 'decrypt'],
			},
		},
		options: [
			{
				displayName: 'Encryption Context (JSON)',
				name: 'EncryptionContext',
				type: 'json',
				default: '{}',
				description: 'Key-value pairs for additional authenticated data',
			},
		],
	},
];
