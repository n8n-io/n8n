import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	ICredentialDataDecryptedObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class AgentVault implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AgentVault',
		name: 'agentVault',
		icon: 'file:agentvault.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Secure credential storage and sharing with AgentVault',
		defaults: {
			name: 'AgentVault',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'agentVaultApi',
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
						name: 'Store Credential',
						value: 'storeCredential',
						description: 'Store a new credential in the vault',
						action: 'Store a credential',
					},
					{
						name: 'Get Credential',
						value: 'getCredential',
						description: 'Retrieve a credential from the vault',
						action: 'Get a credential',
					},
					{
						name: 'Share Credential',
						value: 'shareCredential',
						description: 'Create a shareable token for a credential',
						action: 'Share a credential',
					},
					{
						name: 'Receive Credential',
						value: 'receiveCredential',
						description: 'Receive a credential using a share token',
						action: 'Receive a shared credential',
					},
					{
						name: 'List Credentials',
						value: 'listCredentials',
						description: 'List all stored credentials',
						action: 'List credentials',
					},
				],
				default: 'storeCredential',
			},
			// Store Credential Fields
			{
				displayName: 'Credential Name',
				name: 'credentialName',
				type: 'string',
				default: '',
				placeholder: 'my-api-key',
				description: 'Unique name/identifier for the credential',
				displayOptions: {
					show: {
						operation: ['storeCredential'],
					},
				},
				required: true,
			},
			{
				displayName: 'Credential Value',
				name: 'credentialValue',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description: 'The secret value to store',
				displayOptions: {
					show: {
						operation: ['storeCredential'],
					},
				},
				required: true,
			},
			{
				displayName: 'Credential Type',
				name: 'credentialType',
				type: 'options',
				options: [
					{ name: 'API Key', value: 'apiKey' },
					{ name: 'OAuth Token', value: 'oauthToken' },
					{ name: 'Password', value: 'password' },
					{ name: 'Certificate', value: 'certificate' },
					{ name: 'SSH Key', value: 'sshKey' },
					{ name: 'Other', value: 'other' },
				],
				default: 'apiKey',
				description: 'Type of credential being stored',
				displayOptions: {
					show: {
						operation: ['storeCredential'],
					},
				},
			},
			{
				displayName: 'Metadata',
				name: 'metadata',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				placeholder: 'Add Metadata',
				default: {},
				description: 'Additional metadata for the credential',
				displayOptions: {
					show: {
						operation: ['storeCredential'],
					},
				},
				options: [
					{
						name: 'metadataValues',
						displayName: 'Metadata',
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
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				placeholder: 'production, aws, critical',
				description: 'Comma-separated tags for categorization',
				displayOptions: {
					show: {
						operation: ['storeCredential'],
					},
				},
			},
			{
				displayName: 'Expiry Date',
				name: 'expiryDate',
				type: 'dateTime',
				default: '',
				description: 'Optional expiration date for the credential',
				displayOptions: {
					show: {
						operation: ['storeCredential'],
					},
				},
			},
			// Get Credential Fields
			{
				displayName: 'Credential Identifier',
				name: 'credentialId',
				type: 'string',
				default: '',
				placeholder: 'my-api-key',
				description: 'Name or ID of the credential to retrieve',
				displayOptions: {
					show: {
						operation: ['getCredential'],
					},
				},
				required: true,
			},
			{
				displayName: 'Include Metadata',
				name: 'includeMetadata',
				type: 'boolean',
				default: true,
				description: 'Whether to include additional metadata in the response',
				displayOptions: {
					show: {
						operation: ['getCredential'],
					},
				},
			},
			// Share Credential Fields
			{
				displayName: 'Credential Identifier',
				name: 'shareCredentialId',
				type: 'string',
				default: '',
				placeholder: 'my-api-key',
				description: 'Name or ID of the credential to share',
				displayOptions: {
					show: {
						operation: ['shareCredential'],
					},
				},
				required: true,
			},
			{
				displayName: 'Expiry (Hours)',
				name: 'shareExpiry',
				type: 'number',
				default: 24,
				description: 'How long the share token remains valid (1-720 hours)',
				typeOptions: {
					minValue: 1,
					maxValue: 720,
				},
				displayOptions: {
					show: {
						operation: ['shareCredential'],
					},
				},
			},
			{
				displayName: 'Max Uses',
				name: 'maxUses',
				type: 'number',
				default: 1,
				description: 'Maximum number of times the token can be redeemed',
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						operation: ['shareCredential'],
					},
				},
			},
			{
				displayName: 'Recipient',
				name: 'recipient',
				type: 'string',
				default: '',
				placeholder: 'agent-123',
				description: 'Optional identifier for the intended recipient',
				displayOptions: {
					show: {
						operation: ['shareCredential'],
					},
				},
			},
			// Receive Credential Fields
			{
				displayName: 'Share Token',
				name: 'shareToken',
				type: 'string',
				typeOptions: {
					password: true,
				},
				default: '',
				description: 'The share token received from another agent/workflow',
				displayOptions: {
					show: {
						operation: ['receiveCredential'],
					},
				},
				required: true,
			},
			{
				displayName: 'Store Locally',
				name: 'storeLocally',
				type: 'boolean',
				default: false,
				description: 'Whether to save the received credential to local vault',
				displayOptions: {
					show: {
						operation: ['receiveCredential'],
					},
				},
			},
			{
				displayName: 'Local Name',
				name: 'localName',
				type: 'string',
				default: '',
				placeholder: 'received-credential',
				description: 'Name to store the credential under locally',
				displayOptions: {
					show: {
						operation: ['receiveCredential'],
						storeLocally: [true],
					},
				},
			},
			// List Credentials Fields
			{
				displayName: 'Filter by Type',
				name: 'filterType',
				type: 'options',
				options: [
					{ name: 'All', value: 'all' },
					{ name: 'API Key', value: 'apiKey' },
					{ name: 'OAuth Token', value: 'oauthToken' },
					{ name: 'Password', value: 'password' },
					{ name: 'Certificate', value: 'certificate' },
					{ name: 'SSH Key', value: 'sshKey' },
					{ name: 'Other', value: 'other' },
				],
				default: 'all',
				description: 'Filter credentials by type',
				displayOptions: {
					show: {
						operation: ['listCredentials'],
					},
				},
			},
			{
				displayName: 'Filter by Tags',
				name: 'filterTags',
				type: 'string',
				default: '',
				placeholder: 'production, aws',
				description: 'Comma-separated tags to filter by',
				displayOptions: {
					show: {
						operation: ['listCredentials'],
					},
				},
			},
			{
				displayName: 'Include Expired',
				name: 'includeExpired',
				type: 'boolean',
				default: false,
				description: 'Whether to include expired credentials in the list',
				displayOptions: {
					show: {
						operation: ['listCredentials'],
					},
				},
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				default: false,
				description: 'Whether to return all results or only up to a given limit',
				displayOptions: {
					show: {
						operation: ['listCredentials'],
					},
				},
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				description: 'Max number of results to return',
				typeOptions: {
					minValue: 1,
					maxValue: 1000,
				},
				displayOptions: {
					show: {
						operation: ['listCredentials'],
						returnAll: [false],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		// Get credentials
		const credentials = (await this.getCredentials('agentVaultApi')) as ICredentialDataDecryptedObject;
		const baseUrl = (credentials.baseUrl as string) || 'http://localhost:6125';
		const apiKey = credentials.apiKey as string;
		const organizationId = (credentials.organizationId as string) || undefined;

		// Build request headers
		const headers: IDataObject = {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${apiKey}`,
			'User-Agent': 'n8n-AgentVault-Node/1.0',
		};

		if (organizationId) {
			headers['X-Organization-ID'] = organizationId;
		}

		for (let i = 0; i < items.length; i++) {
			try {
				let responseData: IDataObject = {};

				if (operation === 'storeCredential') {
					// Store Credential
					const credentialName = this.getNodeParameter('credentialName', i) as string;
					const credentialValue = this.getNodeParameter('credentialValue', i) as string;
					const credentialType = this.getNodeParameter('credentialType', i) as string;
					const metadata = this.getNodeParameter('metadata', i) as IDataObject;
					const tags = this.getNodeParameter('tags', i) as string;
					const expiryDate = this.getNodeParameter('expiryDate', i) as string;

					const body: IDataObject = {
						name: credentialName,
						value: credentialValue,
						type: credentialType,
					};

					if (tags) {
						body.tags = tags.split(',').map((t) => t.trim());
					}

					if (expiryDate) {
						body.expiresAt = new Date(expiryDate).toISOString();
					}

					if (metadata && (metadata.metadataValues as IDataObject[])?.length > 0) {
						const metaObj: IDataObject = {};
						for (const item of metadata.metadataValues as IDataObject[]) {
							if (item.key) {
								metaObj[item.key as string] = item.value;
							}
						}
						body.metadata = metaObj;
					}

					responseData = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/api/v1/credentials`,
						headers,
						body,
						json: true,
					});

				} else if (operation === 'getCredential') {
					// Get Credential
					const credentialId = this.getNodeParameter('credentialId', i) as string;
					const includeMetadata = this.getNodeParameter('includeMetadata', i) as boolean;

					const qs: IDataObject = {};
					if (includeMetadata) {
						qs.includeMetadata = 'true';
					}

					responseData = await this.helpers.request({
						method: 'GET',
						url: `${baseUrl}/api/v1/credentials/${encodeURIComponent(credentialId)}`,
						headers,
						qs,
						json: true,
					});

				} else if (operation === 'shareCredential') {
					// Share Credential
					const shareCredentialId = this.getNodeParameter('shareCredentialId', i) as string;
					const shareExpiry = this.getNodeParameter('shareExpiry', i) as number;
					const maxUses = this.getNodeParameter('maxUses', i) as number;
					const recipient = this.getNodeParameter('recipient', i) as string;

					const body: IDataObject = {
						credentialId: shareCredentialId,
						expiresInHours: shareExpiry,
						maxUses,
					};

					if (recipient) {
						body.recipient = recipient;
					}

					responseData = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/api/v1/shares`,
						headers,
						body,
						json: true,
					});

				} else if (operation === 'receiveCredential') {
					// Receive Credential
					const shareToken = this.getNodeParameter('shareToken', i) as string;
					const storeLocally = this.getNodeParameter('storeLocally', i) as boolean;
					const localName = storeLocally
						? (this.getNodeParameter('localName', i) as string)
						: undefined;

					const body: IDataObject = {
						token: shareToken,
					};

					if (localName) {
						body.storeAs = localName;
					}

					responseData = await this.helpers.request({
						method: 'POST',
						url: `${baseUrl}/api/v1/shares/redeem`,
						headers,
						body,
						json: true,
					});

				} else if (operation === 'listCredentials') {
					// List Credentials
					const filterType = this.getNodeParameter('filterType', i) as string;
					const filterTags = this.getNodeParameter('filterTags', i) as string;
					const includeExpired = this.getNodeParameter('includeExpired', i) as boolean;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const limit = returnAll ? 1000 : (this.getNodeParameter('limit', i) as number);

					const qs: IDataObject = {
						limit,
						includeExpired: includeExpired ? 'true' : 'false',
					};

					if (filterType !== 'all') {
						qs.type = filterType;
					}

					if (filterTags) {
						qs.tags = filterTags;
					}

					responseData = await this.helpers.request({
						method: 'GET',
						url: `${baseUrl}/api/v1/credentials`,
						headers,
						qs,
						json: true,
					});
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, {
					itemIndex: i,
				});
			}
		}

		return [returnData];
	}
}
