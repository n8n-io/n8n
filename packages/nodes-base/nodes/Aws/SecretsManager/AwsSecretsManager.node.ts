import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeApiError } from 'n8n-workflow';

import { awsApiRequestREST } from '../GenericFunctions';

export class AwsSecretsManager implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS Secrets Manager',
		name: 'awsSecretsManager',
		icon: 'file:secretsmanager.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Manage secrets, API keys, and credentials with Secrets Manager',
		defaults: {
			name: 'AWS Secrets Manager',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create Secret',
						value: 'createSecret',
						description: 'Create a new secret',
						action: 'Create secret',
					},
					{
						name: 'Get Secret Value',
						value: 'getSecretValue',
						description: 'Retrieve secret value',
						action: 'Get secret value',
					},
					{
						name: 'Update Secret',
						value: 'updateSecret',
						description: 'Update secret value',
						action: 'Update secret',
					},
					{
						name: 'List Secrets',
						value: 'listSecrets',
						description: 'List all secrets',
						action: 'List secrets',
					},
					{
						name: 'Delete Secret',
						value: 'deleteSecret',
						description: 'Delete a secret',
						action: 'Delete secret',
					},
				],
				default: 'getSecretValue',
			},
			// Create Secret
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createSecret'],
					},
				},
				default: '',
				required: true,
				description: 'Unique secret name',
			},
			{
				displayName: 'Secret Type',
				name: 'secretType',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['createSecret', 'updateSecret'],
					},
				},
				options: [
					{ name: 'String', value: 'string' },
					{ name: 'Key-Value Pairs', value: 'keyValue' },
					{ name: 'Binary', value: 'binary' },
				],
				default: 'string',
				required: true,
				description: 'Type of secret',
			},
			{
				displayName: 'Secret String',
				name: 'secretString',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createSecret', 'updateSecret'],
						secretType: ['string', 'keyValue'],
					},
				},
				typeOptions: {
					password: true,
					rows: 4,
				},
				default: '',
				required: true,
				description: 'Secret value',
			},
			{
				displayName: 'Secret Binary',
				name: 'secretBinary',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['createSecret', 'updateSecret'],
						secretType: ['binary'],
					},
				},
				default: '',
				required: true,
				description: 'Base64 encoded binary secret',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['createSecret', 'updateSecret'],
					},
				},
				options: [
					{
						displayName: 'Description',
						name: 'description',
						type: 'string',
						default: '',
						description: 'Secret description',
					},
					{
						displayName: 'KMS Key ID',
						name: 'kmsKeyId',
						type: 'string',
						default: '',
						description: 'KMS key ID for encryption',
					},
				],
			},
			// Get Secret Value
			{
				displayName: 'Secret ID',
				name: 'secretId',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['getSecretValue', 'updateSecret', 'deleteSecret'],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getSecrets',
				},
				default: '',
				required: true,
				description: 'Secret name or ARN',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['getSecretValue'],
					},
				},
				options: [
					{
						displayName: 'Version ID',
						name: 'versionId',
						type: 'string',
						default: '',
						description: 'Specific version ID',
					},
					{
						displayName: 'Version Stage',
						name: 'versionStage',
						type: 'string',
						default: 'AWSCURRENT',
						description: 'Version stage',
					},
				],
			},
			// List Secrets
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['listSecrets'],
					},
				},
				default: true,
				description: 'Whether to return all secrets',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['listSecrets'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
				},
				default: 50,
				description: 'Max number of results to return',
			},
			// Delete Secret
			{
				displayName: 'Recovery Window In Days',
				name: 'recoveryWindowInDays',
				type: 'number',
				displayOptions: {
					show: {
						operation: ['deleteSecret'],
					},
				},
				typeOptions: {
					minValue: 7,
					maxValue: 30,
				},
				default: 30,
				description: 'Days before permanent deletion (7-30)',
			},
			{
				displayName: 'Force Delete Without Recovery',
				name: 'forceDeleteWithoutRecovery',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['deleteSecret'],
					},
				},
				default: false,
				description: 'Whether to delete immediately without recovery window',
			},
		],
	};

	methods = {
		loadOptions: {
			async getSecrets(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				try {
					const data = await awsApiRequestREST.call(
						this,
						'secretsmanager',
						'POST',
						'/',
						JSON.stringify({ MaxResults: 100 }),
						{
							'X-Amz-Target': 'secretsmanager.ListSecrets',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					if (!data.SecretList) return [];

					return data.SecretList.map((secret: any) => ({
						name: secret.Name,
						value: secret.ARN,
					}));
				} catch (error) {
					return [];
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i);
				let responseData: any;

				if (operation === 'createSecret') {
					const name = this.getNodeParameter('name', i) as string;
					const secretType = this.getNodeParameter('secretType', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					const body: IDataObject = {
						Name: name,
					};

					if (secretType === 'binary') {
						const secretBinary = this.getNodeParameter('secretBinary', i) as string;
						body.SecretBinary = secretBinary;
					} else {
						const secretString = this.getNodeParameter('secretString', i) as string;
						if (secretType === 'keyValue') {
							try {
								JSON.parse(secretString);
							} catch (error) {
								throw new NodeApiError(this.getNode(), {
									message: 'Secret string must be valid JSON for Key-Value Pairs',
								} as any);
							}
						}
						body.SecretString = secretString;
					}

					if (additionalFields.description) {
						body.Description = additionalFields.description;
					}
					if (additionalFields.kmsKeyId) {
						body.KmsKeyId = additionalFields.kmsKeyId;
					}

					responseData = await awsApiRequestREST.call(
						this,
						'secretsmanager',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'secretsmanager.CreateSecret',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);
				} else if (operation === 'getSecretValue') {
					const secretId = this.getNodeParameter('secretId', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					const body: IDataObject = {
						SecretId: secretId,
					};

					if (additionalFields.versionId) {
						body.VersionId = additionalFields.versionId;
					}
					if (additionalFields.versionStage) {
						body.VersionStage = additionalFields.versionStage;
					}

					responseData = await awsApiRequestREST.call(
						this,
						'secretsmanager',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'secretsmanager.GetSecretValue',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					if (responseData.SecretString) {
						try {
							const parsed = JSON.parse(responseData.SecretString);
							responseData.SecretStringParsed = parsed;
						} catch (error) {
							// Not JSON, keep as string
						}
					}
				} else if (operation === 'updateSecret') {
					const secretId = this.getNodeParameter('secretId', i) as string;
					const secretType = this.getNodeParameter('secretType', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					const body: IDataObject = {
						SecretId: secretId,
					};

					if (secretType === 'binary') {
						const secretBinary = this.getNodeParameter('secretBinary', i) as string;
						body.SecretBinary = secretBinary;
					} else {
						const secretString = this.getNodeParameter('secretString', i) as string;
						body.SecretString = secretString;
					}

					if (additionalFields.description) {
						body.Description = additionalFields.description;
					}
					if (additionalFields.kmsKeyId) {
						body.KmsKeyId = additionalFields.kmsKeyId;
					}

					responseData = await awsApiRequestREST.call(
						this,
						'secretsmanager',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'secretsmanager.UpdateSecret',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);
				} else if (operation === 'listSecrets') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					const body: IDataObject = {};

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;
						body.MaxResults = limit;
					}

					responseData = await awsApiRequestREST.call(
						this,
						'secretsmanager',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'secretsmanager.ListSecrets',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);

					responseData = responseData.SecretList || [];
				} else if (operation === 'deleteSecret') {
					const secretId = this.getNodeParameter('secretId', i) as string;
					const recoveryWindowInDays = this.getNodeParameter('recoveryWindowInDays', i) as number;
					const forceDeleteWithoutRecovery = this.getNodeParameter(
						'forceDeleteWithoutRecovery',
						i,
					) as boolean;

					const body: IDataObject = {
						SecretId: secretId,
					};

					if (forceDeleteWithoutRecovery) {
						body.ForceDeleteWithoutRecovery = true;
					} else {
						body.RecoveryWindowInDays = recoveryWindowInDays;
					}

					responseData = await awsApiRequestREST.call(
						this,
						'secretsmanager',
						'POST',
						'/',
						JSON.stringify(body),
						{
							'X-Amz-Target': 'secretsmanager.DeleteSecret',
							'Content-Type': 'application/x-amz-json-1.1',
						},
					);
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: (error as Error).message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionData);
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
