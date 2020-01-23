import {
	BINARY_ENCODING,
	IExecuteFunctions,
} from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

import { disqusApiRequest, disqusApiRequestAllItems } from './GenericFunctions';


export class Disqus implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Disqus',
		name: 'disqus',
		icon: 'file:disqus.png',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Access data on Disqus',
		defaults: {
			name: 'Disqus',
			color: '#22BB44',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'disqusApi',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Forum',
						value: 'forum',
					}
				],
				default: 'forum',
				description: 'The resource to operate on.',
			},

			// ----------------------------------
			//         forum
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'forum',
						],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Returns forum details.',
					},
					{
						name: 'Get All Categories',
						value: 'getCategories',
						description: 'Returns a list of categories within a forum.',
					},
					{
						name: 'Get All Threads',
						value: 'getThreads',
						description: 'Returns a list of threads within a forum.',
					},
					{
						name: 'Get All Posts',
						value: 'getPosts',
						description: 'Returns a list of posts within a forum.',
					}
				],
				default: 'get',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         forum:get
			// ----------------------------------
			{
				displayName: 'Forum name',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'forum',
						],
					},
				},
				description: 'The short name(aka ID) of the forum to get.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'get',
						],
						resource: [
							'forum',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'attach',
						name: 'attach',
						type: 'string',
						default: '[]',
						description: 'Choices: followsForum, forumCanDisableAds, forumForumCategory, counters, forumDaysAlive, forumFeatures, forumIntegration, forumNewPolicy, forumPermissions',
					},
					{
						displayName: 'related',
						name: 'related',
						type: 'string',
						default: false,
						description: 'You may specify relations to include with your response. Choices `author`',
					},
				],
			},

			// ----------------------------------
			//         forum:getPosts
			// ----------------------------------
			{
				displayName: 'Forum name',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'getPosts',
						],
						resource: [
							'forum',
						],
					},
				},
				description: 'The short name(aka ID) of the forum to get.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'forum',
						],
						operation: [
							'getPosts',
						],
					},
				},
				default: false,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: [
							'forum',
						],
						operation: [
							'getPosts',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'How many results to return.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'getPosts',
						],
						resource: [
							'forum',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Since',
						name: 'since',
						type: 'string',
						default: `[]`,
						description: 'Unix timestamp (or ISO datetime standard)',
					},
					{
						displayName: 'Related',
						name: 'related',
						type: 'string',
						default: '[]',
						description: 'You may specify relations to include with your response. Choices `author`',
					},
					{
						displayName: 'Cursor',
						name: 'cursor',
						type: 'string',
						default: '',
						description: 'You may specify cursor for your response.',
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'string',
						default: 25,
						description: 'You may specify relations maximum number of posts to return. Maximum value is 100',
					},
					{
						displayName: 'Filters',
						name: 'filters',
						type: 'string',
						default: '[]',
						description: 'You may specify filters for your response. Choices: `Is_Anonymous`, `Has_Link`, `Has_Low_Rep_Author`, `Has_Bad_Word`, `Is_Flagged`, `No_Issue`, `Is_Toxic`, `Modified_By_Rule`, `Shadow_Banned`, `Has_Media`, `Is_At_Flag_Limit`',
					},
					{
						displayName: 'Query',
						name: 'query',
						type: 'string',
						default: '',
						description: 'You may specify query for your response.',
					},
					{
						displayName: 'Include',
						name: 'include',
						type: 'string',
						default: false,
						description: 'You may specify relations to include with your response. Choices `author`',
					},
					{
						displayName: 'Order',
						name: 'order',
						type: 'string',
						default: 'asc',
						description: 'You may specify order to sort your response.Choices: asc, desc',
					},
				],
			},

			// ----------------------------------
			//         forum:getCategories
			// ----------------------------------
			{
				displayName: 'Forum name',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'getCategories',
						],
						resource: [
							'forum',
						],
					},
				},
				description: 'The short name(aka ID) of the forum to get Categories.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'forum',
						],
						operation: [
							'getCategories',
						],
					},
				},
				default: false,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: [
							'forum',
						],
						operation: [
							'getCategories',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'How many results to return.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'getCategories',
						],
						resource: [
							'forum',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Since ID',
						name: 'sinceId',
						type: 'string',
						default: `[]`,
						description: 'You may specify cursor since_id for your response.',
					},
					{
						displayName: 'Cursor',
						name: 'cursor',
						type: 'string',
						default: '',
						description: 'You may specify cursor for your response.',
					},
					{
						displayName: 'Order',
						name: 'order',
						type: 'string',
						default: 'asc',
						description: 'You may specify order to sort your response.Choices: asc, desc',
					},
				],
			},

			// ----------------------------------
			//         forum:getThreads
			// ----------------------------------
			{
				displayName: 'Forum name',
				name: 'id',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'getThreads',
						],
						resource: [
							'forum',
						],
					},
				},
				description: 'The short name(aka ID) of the forum to get Threads.',
			},
			{
				displayName: 'Return All',
				name: 'returnAll',
				type: 'boolean',
				displayOptions: {
					show: {
						resource: [
							'forum',
						],
						operation: [
							'getThreads',
						],
					},
				},
				default: false,
				description: 'If all results should be returned or only up to a given limit.',
			},
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				displayOptions: {
					show: {
						resource: [
							'forum',
						],
						operation: [
							'getThreads',
						],
						returnAll: [
							false,
						],
					},
				},
				typeOptions: {
					minValue: 1,
					maxValue: 100,
				},
				default: 100,
				description: 'How many results to return.',
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				displayOptions: {
					show: {
						operation: [
							'getThreads',
						],
						resource: [
							'forum',
						],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Thread',
						name: 'threadId',
						type: 'string',
						default: '',
						description: 'Looks up a thread by ID. You may pass us the "ident" query type instead of an ID by including "forum". You may pass us the "link" query type to filter by URL. You must pass the "forum" if you do not have the Pro API Access addon.',
					},
					{
						displayName: 'Since',
						name: 'since',
						type: 'string',
						default: '',
						description: 'Unix timestamp (or ISO datetime standard)',
					},
					{
						displayName: 'Related',
						name: 'related',
						type: 'string',
						default: '[]',
						description: 'You may specify relations to include with your response. Choices `author`',
					},
					{
						displayName: 'Cursor',
						name: 'cursor',
						type: 'string',
						default: '',
						description: 'You may specify cursor for your response.',
					},
					{
						displayName: 'Limit',
						name: 'limit',
						type: 'string',
						default: 25,
						description: 'You may specify relations maximum number of posts to return. Maximum value is 100',
					},
					{
						displayName: 'Include',
						name: 'include',
						type: 'string',
						default: '',
						description: 'You may specify relations to include with your response. Choices: open, closed, killed',
					},
					{
						displayName: 'Order',
						name: 'order',
						type: 'string',
						default: 'desc',
						description: 'You may specify order to sort your response.Choices: asc, desc',
					},
				],
			}
		],
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];


		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let endpoint = '';
		let requestMethod = '';
		let body: IDataObject | Buffer;
		let qs: IDataObject;


		for (let i = 0; i < items.length; i++) {
			body = {};
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

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					Object.assign(qs, additionalFields);

					try {
						const responseData = await disqusApiRequest.call(this, requestMethod, qs, endpoint);
						returnData.push(responseData.response);
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
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					qs.forum = id;
					qs.limit = 100;

					try {
						let responseData: IDataObject = {};
						if(returnAll) {
							responseData.response = await disqusApiRequestAllItems.call(this, requestMethod, qs, endpoint);
						} else {
							const limit = this.getNodeParameter('limit', i) as string;
							qs.limit = limit;
							responseData = await disqusApiRequest.call(this, requestMethod, qs, endpoint);
						}
						returnData.push.apply(returnData, responseData.response as IDataObject[]);
					} catch (error) {
						throw error;
					}

				}  else if (operation === 'getCategories') {
					// ----------------------------------
					//         getCategories
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = 'forums/listCategories.json';

					const id = this.getNodeParameter('id', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(qs, additionalFields);

					qs.forum = id;
					qs.limit = 100;

					try {
						let responseData: IDataObject = {};

						if(returnAll) {
							responseData.response = await disqusApiRequestAllItems.call(this, requestMethod, qs, endpoint);
						} else {
							const limit = this.getNodeParameter('limit', i) as string;
							qs.limit = limit;
							responseData = await disqusApiRequest.call(this, requestMethod, qs, endpoint) as IDataObject;
						}
						returnData.push.apply(returnData, responseData.response as IDataObject[]) ;
					} catch (error) {
						throw error;
					}

				}  else if (operation === 'getThreads') {
					// ----------------------------------
					//         getThreads
					// ----------------------------------

					requestMethod = 'GET';

					endpoint = 'forums/listThreads.json';

					const id = this.getNodeParameter('id', i) as string;
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					qs.forum = id;
					qs.limit = 100;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					Object.assign(qs, additionalFields);

					try {
						let responseData: IDataObject = {};
						if(returnAll) {
							responseData.response = await disqusApiRequestAllItems.call(this, requestMethod, qs, endpoint);
						} else {
							const limit = this.getNodeParameter('limit', i) as string;
							qs.limit = limit;
							responseData = await disqusApiRequest.call(this, requestMethod, qs, endpoint);
						}
						returnData.push.apply(returnData, responseData.response as IDataObject[]);
					} catch (error) {
						throw error;
					}

				} else {
					throw new Error(`The operation "${operation}" is not known!`);
				}

			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
