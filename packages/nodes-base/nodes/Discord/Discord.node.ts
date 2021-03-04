import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	discordApiRequest,
} from './GenericFunctions';

import {
	messageFields,
	messageOperations,
	userFields,
	userOperations,
} from './descriptions';

export class Discord implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Discord',
		name: 'discord',
		icon: 'file:discord.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Discord API',
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
						name: 'Message',
						value: 'message',
					},
					{
						name: 'User',
						value: 'user',
					},
				],
				default: 'message',
				description: 'Resource to consume',
			},
			...messageOperations,
			...messageFields,
			...userOperations,
			...userFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

			if (resource === 'message') {

				// *********************************************************************
				//                             message
				// *********************************************************************

				if (operation === 'create') {

					// ----------------------------------
					//         message: create
					// ----------------------------------

					const credentials = this.getCredentials('discordOAuth2Api') as {
						oauthTokenData: { webhook: { url: string } }
					};

					const webhookUrl = credentials.oauthTokenData.webhook.url;

					const body: IDataObject = {
						content: this.getNodeParameter('content', i),
					};

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.assign(body, additionalFields);

					await discordApiRequest.call(this, 'POST', '', body, {}, webhookUrl);
					responseData = { success: true };
				}
			}

			if (resource === 'user') {

				// *********************************************************************
				//                              user
				// *********************************************************************

				if (operation === 'get') {

					// ----------------------------------
					//         user: get
					// ----------------------------------

					const details = this.getNodeParameter('details', i) as 'currentUser' | 'currentUserGuilds' | 'currentserConnections';

					const endpoints: { [key: string]: string } = {
						currentUser: '@/me',
						currentUserGuilds: '@/me/guilds',
						currentUserConnections: '@/me/connections',
					};

					responseData = await discordApiRequest.call(this, 'GET', `/users/${endpoints[details]}`);
				}
			}

		Array.isArray(responseData)
			? returnData.push(...responseData)
			: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
