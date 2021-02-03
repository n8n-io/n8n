import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	discordApiRequest,
} from './GenericFunctions';

import {
	channelFields,
	channelOperations,
} from './ChannelDescription';

import {
	userFields,
	userOperations,
} from './UserDescription';

export class Discord implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Discord',
		name: 'discord',
		icon: 'file:discord.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Discord API',
		defaults: {
			name: 'Discord',
			color: '#7289da',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'discordOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Channel',
						value: 'channel',
					},
					{
						name: 'Message',
						value: 'message',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'channel',
				description: 'Resource to consume.',
			},
			// Channel
			...channelOperations,
			...channelFields,
			// User
			...userOperations,
			...userFields,
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				displayOptions: {
					show: {
						resource: [
							'message',
						],
					},
				},
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a message',
					},
				],
				default: 'create',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Content',
				name: 'content',
				type: 'string',
				default: '',
				required: true,
				displayOptions: {
					show: {
						resource: [
							'message',
						],
						operation: [
							'create',
						],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		const qs: IDataObject = {};
		let responseData;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < length; i++) {
			if (resource === 'message') {
				if (operation === 'create') {
					const content = this.getNodeParameter('content', i) as string;
					const { oauthTokenData } = this.getCredentials('discordOAuth2Api') as IDataObject;
					const { webhook: { url } } = oauthTokenData as { webhook: { url: string } };
					const body: IDataObject = {
						content,
					};
					responseData = await discordApiRequest.call(this, 'POST', '', body, {}, url);
					responseData = { success: true };
				}
			}
			if (resource === 'user') {
				if (operation === 'getCurrentUser') {
					responseData = await discordApiRequest.call(this, 'GET', `/users/@me`);
				}
			}
			if (resource === 'channel') {
				if (operation === 'getChannel') {
					const channelId = this.getNodeParameter('channelId', i) as string;

					responseData = await discordApiRequest.call(this, 'GET', `/channels/${channelId}`);
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
