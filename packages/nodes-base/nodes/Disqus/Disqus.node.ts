import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { disqusApiRequest, disqusApiRequestAllItems } from './GenericFunctions';

export class Disqus implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Disqus',
		name: 'disqus',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:disqus.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Access data on Disqus',
		defaults: {
			name: 'Disqus',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'disqusApi',
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
						name: 'Forum',
						value: 'forum',
					},
				],
				default: 'forum',
			},

			// ----------------------------------
			//         forum
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['forum'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Return forum details',
						action: 'Get a forum',
					},
					{
						name: 'Get All Categories',
						value: 'getCategories',
						description: 'Return a list of categories within a forum',
						action: 'Get all categories in a forum',
					},
					{
						name: 'Get All Threads',
						value: 'getThreads',
						description: 'Return a list of threads within a forum',
						action: 'Get all threads in a forum',
					},
					{
						name: 'Get All Posts',
						value: 'getPosts',
						description: 'Return a list of posts within a forum',
						action: 'Get all posts in a forum',
					},
				],
				default: 'get',
			},

			// ----------------------------------
			//         forum:get
			// ----------------------------------
			{
				displayName: 'Forum Name',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['get'],
						resource: ['forum'],
					},
				},
				description: 'The short name(aka ID) of the forum to get',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: ['get'],
						resource: ['forum'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Attach',
						name: 'attach',
						type: 'multiOptions',
						options: [
							{
								name: 'Counters',
								value: 'counters',
							},
							{
								name: 'followsForum',
								value: 'followsForum',
							},
							{
								name: 'forumCanDisableAds',
								value: 'forumCanDisableAds',
							},
							{
								name: 'forumDaysAlive',
								value: 'forumDaysAlive',
							},
							{
								name: 'forumFeatures',
								value: 'forumFeatures',
							},
							{
								name: 'forumForumCategory',
								value: 'forumForumCategory',
							},
							{
								name: 'forumIntegration',
								value: 'forumIntegration',
							},
							{
								name: 'forumNewPolicy',
								value: 'forumNewPolicy',
							},
							{
								name: 'forumPermissions',
								value: 'forumPermissions',
							},
						],
						default: [],
					},
					{
						displayName: 'Related',
						name: 'related',
						type: 'multiOptions',
						options: [
							{
								name: 'author',
								value: 'author',
							},
						],
						default: [],
						description: 'You may specify relations to include with your response',
					},
				],
			},

			// ----------------------------------
			//         forum:getPosts
			// ----------------------------------
			{
				displayName: 'Forum Name',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['getPosts'],
						resource: ['forum'],
					},
				},
				description: 'The short name(aka ID) of the forum to get',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['forum'],
						operation: ['getPosts'],
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
						resource: ['forum'],
						operation: ['getPosts'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: ['getPosts'],
						resource: ['forum'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Filters',
						name: 'filters',
						type: 'multiOptions',
						options: [
							{
								name: 'Has_Bad_Word',
								value: 'Has_Bad_Word',
							},
							{
								name: 'Has_Link',
								value: 'Has_Link',
							},
							{
								name: 'Has_Low_Rep_Author',
								value: 'Has_Low_Rep_Author',
							},
							{
								name: 'Has_Media',
								value: 'Has_Media',
							},
							{
								name: 'Is_Anonymous',
								value: 'Is_Anonymous',
							},
							{
								name: 'Is_At_Flag_Limit',
								value: 'Is_At_Flag_Limit',
							},
							{
								name: 'Is_Flagged',
								value: 'Is_Flagged',
							},
							{
								name: 'Is_Toxic',
								value: 'Is_Toxic',
							},
							{
								name: 'Modified_By_Rule',
								value: 'Modified_By_Rule',
							},
							{
								name: 'No_Issue',
								value: 'No_Issue',
							},
							{
								name: 'Shadow_Banned',
								value: 'Shadow_Banned',
							},
						],
						default: [],
						description: 'You may specify filters for your response',
					},
					{
						displayName: 'Include',
						name: 'include',
						type: 'multiOptions',
						options: [
							{
								name: 'Approved',
								value: 'approved',
							},
						],
						default: [],
						description: 'You may specify relations to include with your response',
					},
					{
						displayName: 'Order',
						name: 'order',
						type: 'options',
						options: [
							{
								name: 'ASC',
								value: 'asc',
							},
							{
								name: 'DESC',
								value: 'desc',
							},
						],
						default: 'asc',
						description: 'You may specify order to sort your response',
					},
					{
						displayName: 'Query',
						name: 'query',
						type: 'string',
						default: '',
						description: 'You may specify query forChoices: asc, desc your response',
					},
					{
						displayName: 'Related',
						name: 'related',
						type: 'multiOptions',
						options: [
							{
								name: 'Thread',
								value: 'thread',
							},
						],
						default: [],
						description: 'You may specify relations to include with your response',
					},
					{
						displayName: 'Since',
						name: 'since',
						type: 'dateTime',
						default: '',
						description: 'Unix timestamp (or ISO datetime standard)',
					},
				],
			},

			// ----------------------------------
			//         forum:getCategories
			// ----------------------------------
			{
				displayName: 'Forum Name',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['getCategories'],
						resource: ['forum'],
					},
				},
				description: 'The short name(aka ID) of the forum to get Categories',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['forum'],
						operation: ['getCategories'],
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
						resource: ['forum'],
						operation: ['getCategories'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: ['getCategories'],
						resource: ['forum'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Order',
						name: 'order',
						type: 'options',
						options: [
							{
								name: 'ASC',
								value: 'asc',
							},
							{
								name: 'DESC',
								value: 'desc',
							},
						],
						default: 'asc',
						description: 'You may specify order to sort your response',
					},
				],
			},

			// ----------------------------------
			//         forum:getThreads
			// ----------------------------------
			{
				displayName: 'Forum Name',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: ['getThreads'],
						resource: ['forum'],
					},
				},
				description: 'The short name(aka ID) of the forum to get Threads',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: ['forum'],
						operation: ['getThreads'],
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
						resource: ['forum'],
						operation: ['getThreads'],
						returnAll: [false],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'Max number of results to return',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: ['getThreads'],
						resource: ['forum'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Related',
						name: 'related',
						type: 'multiOptions',
						options: [
							{
								name: 'author',
								value: 'author',
							},
							{
								name: 'Forum',
								value: 'forum',
							},
						],
						default: [],
						description: 'You may specify relations to include with your response',
					},
					{
						displayName: 'Include',
						name: 'include',
						type: 'multiOptions',
						options: [
							{
								name: 'Closed',
								value: 'closed',
							},
							{
								name: 'Open',
								value: 'open',
							},
							{
								name: 'Killed',
								value: 'killed',
							},
						],
						default: [],
						description: 'You may specify relations to include with your response',
					},
					{
						displayName: 'Order',
						name: 'order',
						type: 'options',
						options: [
							{
								name: 'ASC',
								value: 'asc',
							},
							{
								name: 'DESC',
								value: 'desc',
							},
						],
						default: 'asc',
						description: 'You may specify order to sort your response',
					},
					{
						displayName: 'Since',
						name: 'since',
						type: 'dateTime',
						default: '',
						description: 'Unix timestamp (or ISO datetime standard)',
					},
					{
						displayName: 'Thread',
						name: 'threadId',
						type: 'string',
						default: '',
						description:
							'Looks up a thread by ID. You may pass us the "ident" query type instead of an ID by including "forum". You may pass us the "link" query type to filter by URL. You must pass the "forum" if you do not have the Pro API Access addon.',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let endpoint = '';
		let requestMethod = '';
		let _body: IDataObject | Buffer;
		let qs: IDataObject;

		for (let i = 0; i < items.length; i++) {
			try {
				_body = {};
				qs = {};

				if (resource === 'forum') {
					if (operation === 'get') {
						// ----------------------------------
						//         get
						// ----------------------------------

						requestMethod = 'GET';

						endpoint = 'forums/details.json';

						const id = this.getNodeParameter('id', i) as string;
						qs.forum = id;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						Object.assign(qs, additionalFields);

						try {
							const responseData = await disqusApiRequest.call(this, requestMethod, qs, endpoint);
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseData.response),
								{ itemData: { item: i } },
							);
							returnData.push(...executionData);
						} catch (error) {
							throw error;
						}
					} else if (operation === 'getPosts') {
						// ----------------------------------
						//         getPosts
						// ----------------------------------

						requestMethod = 'GET';

						endpoint = 'forums/listPosts.json';

						const id = this.getNodeParameter('id', i) as string;
						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);

						const returnAll = this.getNodeParameter('returnAll', i);

						qs.forum = id;
						qs.limit = 100;

						try {
							let responseData: IDataObject = {};
							if (returnAll) {
								responseData.response = await disqusApiRequestAllItems.call(
									this,
									requestMethod,
									qs,
									endpoint,
								);
							} else {
								const limit = this.getNodeParameter('limit', i);
								qs.limit = limit;
								responseData = await disqusApiRequest.call(this, requestMethod, qs, endpoint);
							}
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseData.response as IDataObject),
								{ itemData: { item: i } },
							);
							returnData.push(...executionData);
						} catch (error) {
							throw error;
						}
					} else if (operation === 'getCategories') {
						// ----------------------------------
						//         getCategories
						// ----------------------------------

						requestMethod = 'GET';

						endpoint = 'forums/listCategories.json';

						const id = this.getNodeParameter('id', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);
						const additionalFields = this.getNodeParameter('additionalFields', i);
						Object.assign(qs, additionalFields);

						qs.forum = id;
						qs.limit = 100;

						try {
							let responseData: IDataObject = {};

							if (returnAll) {
								responseData.response = await disqusApiRequestAllItems.call(
									this,
									requestMethod,
									qs,
									endpoint,
								);
							} else {
								const limit = this.getNodeParameter('limit', i);
								qs.limit = limit;
								responseData = (await disqusApiRequest.call(
									this,
									requestMethod,
									qs,
									endpoint,
								)) as IDataObject;
							}
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseData.response as IDataObject),
								{ itemData: { item: i } },
							);
							returnData.push(...executionData);
						} catch (error) {
							throw error;
						}
					} else if (operation === 'getThreads') {
						// ----------------------------------
						//         getThreads
						// ----------------------------------

						requestMethod = 'GET';

						endpoint = 'forums/listThreads.json';

						const id = this.getNodeParameter('id', i) as string;
						const returnAll = this.getNodeParameter('returnAll', i);

						qs.forum = id;
						qs.limit = 100;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						Object.assign(qs, additionalFields);

						try {
							let responseData: IDataObject = {};
							if (returnAll) {
								responseData.response = await disqusApiRequestAllItems.call(
									this,
									requestMethod,
									qs,
									endpoint,
								);
							} else {
								const limit = this.getNodeParameter('limit', i);
								qs.limit = limit;
								responseData = await disqusApiRequest.call(this, requestMethod, qs, endpoint);
							}
							const executionData = this.helpers.constructExecutionMetaData(
								this.helpers.returnJsonArray(responseData.response as IDataObject),
								{ itemData: { item: i } },
							);
							returnData.push(...executionData);
						} catch (error) {
							throw error;
						}
					} else {
						throw new NodeOperationError(
							this.getNode(),
							`The operation "${operation}" is not known!`,
							{ itemIndex: i },
						);
					}
				} else {
					throw new NodeOperationError(this.getNode(), `The resource "${resource}" is not known!`, {
						itemIndex: i,
					});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
