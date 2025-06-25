import { createHash } from 'crypto';
import type {
	INodeType,
	INodeTypeDescription,
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	IHttpRequestOptions,
} from 'n8n-workflow';
import { ApplicationError, NodeConnectionTypes } from 'n8n-workflow';

/**
 * Generate Cloudinary signature for signed uploads
 */
function generateCloudinarySignature(params: IDataObject, apiSecret: string): string {
	// Remove signature, api_key, and file from params for signature generation
	const { signature, api_key, file, ...paramsToSign } = params;

	// Sort parameters alphabetically and create query string
	const sortedParams = Object.keys(paramsToSign)
		.sort()
		.map((key) => `${key}=${paramsToSign[key]}`)
		.join('&');

	// Append API secret
	const stringToSign = `${sortedParams}${apiSecret}`;

	// Generate SHA1 hash
	return createHash('sha1').update(stringToSign).digest('hex');
}

export class Cloudinary implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Cloudinary',
		name: 'cloudinary',
		icon: 'file:cloudinary.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Upload to Cloudinary',
		defaults: {
			name: 'Cloudinary',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'cloudinaryApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Upload',
						value: 'upload',
					},
					{
						name: 'Update Asset',
						value: 'updateAsset',
					},
					{
						name: 'Admin',
						value: 'admin',
					},
				],
				default: 'upload',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['upload'],
					},
				},
				options: [
					{
						name: 'Upload From URL',
						value: 'uploadUrl',
						description: 'Upload an asset from URL',
						action: 'Upload an asset from URL',
					},
					{
						name: 'Upload File',
						value: 'uploadFile',
						description: 'Upload an asset from file data',
						action: 'Upload an asset from file data',
					},
				],
				default: 'uploadUrl',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['updateAsset'],
					},
				},
				options: [
					{
						name: 'Update Asset Tags',
						value: 'updateTags',
						description: 'Update tags for an existing asset',
						action: 'Update asset tags',
					},
					{
						name: 'Update Asset Structured Metadata',
						value: 'updateMetadata',
						description: 'Update structured metadata for an existing asset',
						action: 'Update asset structured metadata',
					},
				],
				default: 'updateTags',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['admin'],
					},
				},
				options: [
					{
						name: 'Get Tags',
						value: 'getTags',
						description: 'Get all tags for a specific resource type',
						action: 'Get tags for a resource type',
					},
					{
						name: 'Get Metadata Fields',
						value: 'getMetadataFields',
						description: 'Get all metadata fields definitions',
						action: 'Get metadata fields definitions',
					},
				],
				default: 'getTags',
			},
			{
				displayName: 'URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'URL of the image to upload',
				required: true,
				displayOptions: {
					show: {
						resource: ['upload'],
						operation: ['uploadUrl'],
					},
				},
			},
			{
				displayName: 'Resource Type',
				name: 'resource_type',
				type: 'options',
				options: [
					{
						name: 'Image',
						value: 'image',
					},
					{
						name: 'Video',
						value: 'video',
					},
					{
						name: 'Raw',
						value: 'raw',
					},
				],
				default: 'image',
				description: 'The type of asset to upload',
				displayOptions: {
					show: {
						resource: ['upload'],
						operation: ['uploadUrl'],
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						resource: ['upload'],
						operation: ['uploadUrl'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Public ID',
						name: 'public_id',
						type: 'string',
						default: '',
						description: 'The public ID of the resource',
					},
					{
						displayName: 'Folder',
						name: 'folder',
						type: 'string',
						default: '',
						description: 'Folder name where the asset will be stored',
					},
					{
						displayName: 'Upload Preset',
						name: 'upload_preset',
						type: 'string',
						default: '',
						description: 'Name of an upload preset that you defined for your Cloudinary account',
					},
				],
			},
			{
				displayName: 'Public ID',
				name: 'publicId',
				type: 'string',
				default: '',
				description: 'The public ID of the asset to update',
				required: true,
				displayOptions: {
					show: {
						resource: ['updateAsset'],
						operation: ['updateTags', 'updateMetadata'],
					},
				},
			},
			{
				displayName: 'Resource Type',
				name: 'resourceType',
				type: 'options',
				options: [
					{
						name: 'Image',
						value: 'image',
					},
					{
						name: 'Video',
						value: 'video',
					},
					{
						name: 'Raw',
						value: 'raw',
					},
				],
				default: 'image',
				description: 'The type of asset to update',
				displayOptions: {
					show: {
						resource: ['updateAsset'],
						operation: ['updateTags', 'updateMetadata'],
					},
				},
			},
			{
				displayName: 'Type',
				name: 'type',
				type: 'options',
				options: [
					{
						name: 'Upload',
						value: 'upload',
					},
					{
						name: 'Private',
						value: 'private',
					},
					{
						name: 'Authenticated',
						value: 'authenticated',
					},
					{
						name: 'Fetch',
						value: 'fetch',
					},
				],
				default: 'upload',
				description: 'The storage type of the asset',
				required: true,
				displayOptions: {
					show: {
						resource: ['updateAsset'],
						operation: ['updateTags', 'updateMetadata'],
					},
				},
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'A comma-separated list of tag names to assign to the asset',
				required: true,
				displayOptions: {
					show: {
						resource: ['updateAsset'],
						operation: ['updateTags'],
					},
				},
			},
			{
				displayName: 'Structured Metadata',
				name: 'structuredMetadata',
				type: 'json',
				default: '{}',
				description:
					'Structured metadata to attach to the asset as JSON. Example: {"field1": "value1", "field2": "value2"}.',
				required: true,
				displayOptions: {
					show: {
						resource: ['updateAsset'],
						operation: ['updateMetadata'],
					},
				},
			},
			{
				displayName: 'Resource Type',
				name: 'getTagsResourceType',
				type: 'options',
				options: [
					{
						name: 'Image',
						value: 'image',
					},
					{
						name: 'Video',
						value: 'video',
					},
					{
						name: 'Raw',
						value: 'raw',
					},
				],
				default: 'image',
				description: 'The type of resource to get tags for',
				required: true,
				displayOptions: {
					show: {
						resource: ['admin'],
						operation: ['getTags'],
					},
				},
			},
			{
				displayName: 'Prefix',
				name: 'tagsPrefix',
				type: 'string',
				default: '',
				description: 'Filter tags that start with this prefix',
				displayOptions: {
					show: {
						resource: ['admin'],
						operation: ['getTags'],
					},
				},
			},
			{
				displayName: 'Max Results',
				name: 'tagsMaxResults',
				type: 'number',
				default: 100,
				description: 'Maximum number of tags to return (1-500)',
				typeOptions: {
					minValue: 1,
					maxValue: 500,
				},
				displayOptions: {
					show: {
						resource: ['admin'],
						operation: ['getTags'],
					},
				},
			},
			{
				displayName: 'Update Fields',
				name: 'updateOptions',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						resource: ['updateAsset'],
						operation: ['updateTags', 'updateMetadata'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Invalidate CDN',
						name: 'invalidate',
						type: 'boolean',
						default: false,
						description: 'Whether to invalidate CDN cache copies of the asset',
					},
				],
			},
			{
				displayName: 'File',
				name: 'file',
				type: 'string',
				typeOptions: {
					propertyType: 'binary',
				},
				default: 'data',
				description: 'The file to upload',
				required: true,
				displayOptions: {
					show: {
						resource: ['upload'],
						operation: ['uploadFile'],
					},
				},
			},
			{
				displayName: 'Resource Type',
				name: 'resource_type_file',
				type: 'options',
				options: [
					{
						name: 'Image',
						value: 'image',
					},
					{
						name: 'Video',
						value: 'video',
					},
					{
						name: 'Raw',
						value: 'raw',
					},
				],
				default: 'image',
				description: 'The type of asset to upload',
				displayOptions: {
					show: {
						resource: ['upload'],
						operation: ['uploadFile'],
					},
				},
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFieldsFile',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						resource: ['upload'],
						operation: ['uploadFile'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Public ID',
						name: 'public_id',
						type: 'string',
						default: '',
						description: 'The public ID of the resource',
					},
					{
						displayName: 'Folder',
						name: 'folder',
						type: 'string',
						default: '',
						description: 'Folder name where the asset will be stored',
					},
					{
						displayName: 'Upload Preset',
						name: 'upload_preset',
						type: 'string',
						default: '',
						description: 'Name of an upload preset that you defined for your Cloudinary account',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('cloudinaryApi');
		const cloudName = credentials.cloudName as string;
		const apiKey = credentials.apiKey as string;
		const apiSecret = credentials.apiSecret as string;

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				if (resource === 'upload' && operation === 'uploadUrl') {
					const url = this.getNodeParameter('url', i) as string;
					const resourceType = this.getNodeParameter('resource_type', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i, {}) as IDataObject;

					// Build parameters for the upload
					const timestamp = Math.round(new Date().getTime() / 1000);
					const params: IDataObject = {
						timestamp,
						api_key: apiKey,
						file: url,
						...additionalFields,
					};

					// Generate signature
					const signature = generateCloudinarySignature(params, apiSecret);
					params.signature = signature;

					// Prepare the URL for upload
					const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

					// Set up the request
					const options: IHttpRequestOptions = {
						method: 'POST',
						url: uploadUrl,
						body: params,
						headers: {
							'Content-Type': 'application/x-www-form-urlencoded',
						},
					};

					// Make the API request
					const response = await this.helpers.httpRequest(options);

					returnData.push({
						json: response,
						pairedItem: i,
					});
				}

				if (resource === 'upload' && operation === 'uploadFile') {
					const fileData = this.getNodeParameter('file', i) as string;
					const resourceType = this.getNodeParameter('resource_type_file', i) as string;
					const additionalFields = this.getNodeParameter(
						'additionalFieldsFile',
						i,
						{},
					) as IDataObject;

					// Get the binary data from input
					const binaryPropertyName = fileData;
					const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
					const dataBuffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

					// Build parameters for the upload (for signature generation)
					const timestamp = Math.round(new Date().getTime() / 1000);
					const params: IDataObject = {
						timestamp,
						api_key: apiKey,
						...additionalFields,
					};

					// Generate signature
					const signature = generateCloudinarySignature(params, apiSecret);

					// Prepare the URL for upload
					const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

					// Use FormData for multipart upload
					const FormData = require('form-data');
					const formData = new FormData();

					// Append the file data
					formData.append('file', dataBuffer, {
						filename: binaryData.fileName || 'file',
						contentType: binaryData.mimeType || 'application/octet-stream',
					});

					// Append other parameters
					formData.append('api_key', apiKey);
					formData.append('timestamp', timestamp.toString());
					formData.append('signature', signature);

					// Append additional fields
					for (const key in additionalFields) {
						formData.append(key, additionalFields[key] as string);
					}

					// Set up the request
					const options: IHttpRequestOptions = {
						method: 'POST',
						url: uploadUrl,
						body: formData,
						headers: {
							...formData.getHeaders(),
						},
					};

					const response = await this.helpers.httpRequest(options);

					returnData.push({
						json: response,
						pairedItem: i,
					});
				}

				if (resource === 'admin' && operation === 'getTags') {
					const resourceType = this.getNodeParameter('getTagsResourceType', i) as string;
					const prefix = this.getNodeParameter('tagsPrefix', i, '') as string;
					const maxResults = this.getNodeParameter('tagsMaxResults', i, 100) as number;

					// Build the URL for tags endpoint
					const tagsUrl = `https://api.cloudinary.com/v1_1/${cloudName}/tags/${resourceType}`;

					// Build query parameters
					const queryParams: IDataObject = {};
					if (prefix) {
						queryParams.prefix = prefix;
					}
					if (maxResults) {
						queryParams.max_results = maxResults;
					}

					// Set up the request with basic auth and query parameters
					const options: IHttpRequestOptions = {
						method: 'GET',
						url: tagsUrl,
						qs: queryParams,
						headers: {
							'Content-Type': 'application/json',
						},
						auth: {
							username: apiKey,
							password: apiSecret,
						},
					};

					// Make the API request
					const response = await this.helpers.httpRequest(options);

					returnData.push({
						json: response,
						pairedItem: i,
					});
				}

				if (resource === 'admin' && operation === 'getMetadataFields') {
					// Build the URL for metadata fields endpoint
					const metadataUrl = `https://api.cloudinary.com/v1_1/${cloudName}/metadata_fields`;

					// Set up the request with basic auth
					const options: IHttpRequestOptions = {
						method: 'GET',
						url: metadataUrl,
						headers: {
							'Content-Type': 'application/json',
						},
						auth: {
							username: apiKey,
							password: apiSecret,
						},
					};

					// Make the API request
					const response = await this.helpers.httpRequest(options);

					returnData.push({
						json: response,
						pairedItem: i,
					});
				}

				if (resource === 'updateAsset' && operation === 'updateTags') {
					const publicId = this.getNodeParameter('publicId', i) as string;
					const resourceType = this.getNodeParameter('resourceType', i) as string;
					const type = this.getNodeParameter('type', i) as string;
					const tags = this.getNodeParameter('tags', i) as string;
					const updateOptions = this.getNodeParameter('updateOptions', i, {}) as IDataObject;

					// Build the request body
					const body: IDataObject = {
						tags,
						...updateOptions,
					};

					// Prepare the URL for resource update
					const updateUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/${type}/${publicId}`;

					// Set up the request with basic auth
					const options: IHttpRequestOptions = {
						method: 'POST',
						url: updateUrl,
						body,
						headers: {
							'Content-Type': 'application/json',
						},
						auth: {
							username: apiKey,
							password: apiSecret,
						},
					};

					// Make the API request
					const response = await this.helpers.httpRequest(options);

					returnData.push({
						json: response,
						pairedItem: i,
					});
				}

				if (resource === 'updateAsset' && operation === 'updateMetadata') {
					const publicId = this.getNodeParameter('publicId', i) as string;
					const resourceType = this.getNodeParameter('resourceType', i) as string;
					const type = this.getNodeParameter('type', i) as string;
					const structuredMetadata = this.getNodeParameter('structuredMetadata', i) as string;
					const updateOptions = this.getNodeParameter('updateOptions', i, {}) as IDataObject;

					// Parse structured metadata
					let metadata: IDataObject;
					try {
						metadata =
							typeof structuredMetadata === 'object'
								? structuredMetadata
								: JSON.parse(structuredMetadata);
					} catch (error) {
						throw new ApplicationError('Invalid JSON for structured metadata');
					}

					// Convert metadata object to pipe-separated string format expected by Cloudinary
					const metadataString = Object.keys(metadata)
						.map((key) => {
							const value = metadata[key];
							// If value is an array, stringify it; otherwise use as is
							const formattedValue = Array.isArray(value) ? JSON.stringify(value) : value;
							return `${key}=${formattedValue}`;
						})
						.join('|');

					// Build the request body
					const body: IDataObject = {
						metadata: metadataString,
						...updateOptions,
					};

					// Prepare the URL for resource update
					const updateUrl = `https://api.cloudinary.com/v1_1/${cloudName}/resources/${resourceType}/${type}/${publicId}`;

					// Set up the request with basic auth
					const options: IHttpRequestOptions = {
						method: 'POST',
						url: updateUrl,
						body,
						headers: {
							'Content-Type': 'application/json',
						},
						auth: {
							username: apiKey,
							password: apiSecret,
						},
					};

					// Make the API request
					const response = await this.helpers.httpRequest(options);

					returnData.push({
						json: response,
						pairedItem: i,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: i,
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
