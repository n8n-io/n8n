import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { mediumApiRequest } from './GenericFunctions';

export class Medium implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Medium',
		name: 'medium',
		group: ['output'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:medium.png',
		version: 1,
		description: 'Consume Medium API',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		defaults: {
			name: 'Medium',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'mediumApi',
				required: true,
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
			},
			{
				name: 'mediumOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: ['oAuth2'],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Post',
						value: 'post',
					},
					{
						name: 'Publication',
						value: 'publication',
					},
				],
				default: 'post',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['post'],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a post',
						action: 'Create a post',
					},
				],
				default: 'create',
			},

			// ----------------------------------
			//         post:create
			// ----------------------------------
			{
				displayName: 'Publication',
				name: 'publication',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
					},
				},
				default: false,
				description: 'Whether you are posting for a publication',
			},
			{
				displayName: 'Publication Name or ID',
				name: 'publicationId',
				type: 'options',
				displayOptions: {
					show: {
						resource: ['post'],
						operation: ['create'],
						publication: [true],
					},
				},
				typeOptions: {
					loadOptionsMethod: 'getPublications',
				},
				default: '',
				description:
					'Publication IDs. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				placeholder: 'My Open Source Contribution',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['post'],
					},
				},
				description: 'Title of the post. Max Length : 100 characters.',
			},
			{
				displayName: 'Content Format',
				name: 'contentFormat',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['post'],
					},
				},
				type: 'options',
				options: [
					{
						name: 'HTML',
						value: 'html',
					},
					{
						name: 'Markdown',
						value: 'markdown',
					},
				],
				description: 'The format of the content to be posted',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				placeholder: 'My open source contribution',
				required: true,
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['post'],
					},
				},
				description: 'The body of the post, in a valid semantic HTML fragment, or Markdown',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: ['create'],
						resource: ['post'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Canonical Url',
						name: 'canonicalUrl',
						type: 'string',
						default: '',
						description:
							'The original home of this content, if it was originally published elsewhere',
					},
					{
						displayName: 'License',
						name: 'license',
						type: 'options',
						default: 'all-rights-reserved',
						options: [
							{
								name: 'all-rights-reserved',
								value: 'all-rights-reserved',
							},
							{
								name: 'cc-40-by',
								value: 'cc-40-by',
							},
							{
								name: 'cc-40-by-nc',
								value: 'cc-40-by-nc',
							},
							{
								name: 'cc-40-by-nc-nd',
								value: 'cc-40-by-nc-nd',
							},
							{
								name: 'cc-40-by-nc-sa',
								value: 'cc-40-by-nc-sa',
							},
							{
								name: 'cc-40-by-nd',
								value: 'cc-40-by-nd',
							},
							{
								name: 'cc-40-by-sa',
								value: 'cc-40-by-sa',
							},
							{
								name: 'cc-40-zero',
								value: 'cc-40-zero',
							},
							{
								name: 'public-domain',
								value: 'public-domain',
							},
						],
						description: 'License of the post',
					},
					{
						displayName: 'Notify Followers',
						name: 'notifyFollowers',
						type: 'boolean',
						default: false,
						description: 'Whether to notify followers that the user has published',
					},
					{
						displayName: 'Publish Status',
						name: 'publishStatus',
						default: 'public',
						type: 'options',
						options: [
							{
								name: 'Public',
								value: 'public',
							},
							{
								name: 'Draft',
								value: 'draft',
							},
							{
								name: 'Unlisted',
								value: 'unlisted',
							},
						],
						description: 'The status of the post',
					},
					{
						displayName: 'Tags',
						name: 'tags',
						type: 'string',
						default: '',
						placeholder: 'open-source,mlh,fellowship',
						description:
							'Comma-separated strings to be used as tags for post classification. Max allowed tags: 5. Max tag length: 25 characters.',
					},
				],
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['publication'],
					},
				},
				options: [
					{
						name: 'Get All',
						value: 'getAll',
						description: 'Get all publications',
						action: 'Get all publications',
					},
				],
				default: 'publication',
			},
			// ----------------------------------
			//         publication:getAll
			// ----------------------------------
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						operation: ['getAll'],
						resource: ['publication'],
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
						resource: ['publication'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 200,
				},
				default: 100,
				description: 'Max number of results to return',
			},
		],
	};
	methods = {
		loadOptions: {
			// Get all the available publications to display them to user so that he can
			// select them easily
			async getPublications(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				//Get the User Id
				const user = await mediumApiRequest.call(this, 'GET', `/me`);

				const userId = user.data.id;
				//Get all publications of that user
				const publications = await mediumApiRequest.call(
					this,
					'GET',
					`/users/${userId}/publications`,
				);
				const publicationsList = publications.data;
				for (const publication of publicationsList) {
					const publicationName = publication.name;
					const publicationId = publication.id;
					returnData.push({
						name: publicationName,
						value: publicationId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		let operation: string;
		let resource: string;

		// For POST
		let bodyRequest: IDataObject;
		// For Query string
		let qs: IDataObject;
		let responseData;

		for (let i = 0; i < items.length; i++) {
			qs = {};
			try {
				resource = this.getNodeParameter('resource', i) as string;
				operation = this.getNodeParameter('operation', i) as string;

				if (resource === 'post') {
					//https://github.com/Medium/medium-api-docs
					if (operation === 'create') {
						// ----------------------------------
						//         post:create
						// ----------------------------------

						const title = this.getNodeParameter('title', i) as string;
						const contentFormat = this.getNodeParameter('contentFormat', i) as string;
						const content = this.getNodeParameter('content', i) as string;
						bodyRequest = {
							tags: [],
							title,
							contentFormat,
							content,
						};

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						if (additionalFields.tags) {
							const tags = additionalFields.tags as string;
							bodyRequest.tags = tags.split(',').map((name) => {
								const returnValue = name.trim();
								if (returnValue.length > 25) {
									throw new NodeOperationError(
										this.getNode(),
										`The tag "${returnValue}" is to long. Maximum lenght of a tag is 25 characters.`,
										{ itemIndex: i },
									);
								}
								return returnValue;
							});

							if ((bodyRequest.tags as string[]).length > 5) {
								throw new NodeOperationError(
									this.getNode(),
									'To many tags got used. Maximum 5 can be set.',
									{ itemIndex: i },
								);
							}
						}

						if (additionalFields.canonicalUrl) {
							bodyRequest.canonicalUrl = additionalFields.canonicalUrl as string;
						}
						if (additionalFields.publishStatus) {
							bodyRequest.publishStatus = additionalFields.publishStatus as string;
						}
						if (additionalFields.license) {
							bodyRequest.license = additionalFields.license as string;
						}
						if (additionalFields.notifyFollowers) {
							bodyRequest.notifyFollowers = additionalFields.notifyFollowers as string;
						}

						const underPublication = this.getNodeParameter('publication', i) as boolean;

						// if user wants to publish it under a specific publication
						if (underPublication) {
							const publicationId = this.getNodeParameter('publicationId', i) as number;

							responseData = await mediumApiRequest.call(
								this,
								'POST',
								`/publications/${publicationId}/posts`,
								bodyRequest,
								qs,
							);
						} else {
							const responseAuthorId = await mediumApiRequest.call(this, 'GET', '/me', {}, qs);

							const authorId = responseAuthorId.data.id;
							responseData = await mediumApiRequest.call(
								this,
								'POST',
								`/users/${authorId}/posts`,
								bodyRequest,
								qs,
							);

							responseData = responseData.data;
						}
					}
				}
				if (resource === 'publication') {
					//https://github.com/Medium/medium-api-docs#32-publications
					if (operation === 'getAll') {
						// ----------------------------------
						//         publication:getAll
						// ----------------------------------

						const returnAll = this.getNodeParameter('returnAll', i) as string;

						const user = await mediumApiRequest.call(this, 'GET', `/me`);

						const userId = user.data.id;
						//Get all publications of that user
						responseData = await mediumApiRequest.call(
							this,
							'GET',
							`/users/${userId}/publications`,
						);

						responseData = responseData.data;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i) as number;
							responseData = responseData.splice(0, limit);
						}
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
