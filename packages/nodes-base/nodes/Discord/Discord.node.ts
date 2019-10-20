import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

export class Discord implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Discord',
		name: 'discord',
		icon: 'file:discord.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["resource"]}}',
		description: 'Sends data to Discord',
		defaults: {
			name: 'Discord',
			color: '#7289da',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Webhook',
						value: 'webhook',
					},
				],
				default: 'webhook',
				description: 'The resource to operate on.',
			},

			// ----------------------------------
			//         message
			// ----------------------------------

			// ----------------------------------
			//         message:post
			// ----------------------------------
			{
				displayName: 'Webhook URL',
				name: 'webhookUri',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				displayOptions: {
					show: {
						resource: [
							'webhook',
						],
					},
				},
				description: 'The webhook url',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				displayOptions: {
					show: {
						resource: [
							'webhook',
						],
					},
				},
				description: 'The text to send.',
			}
		],
	};



	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		let responseData;

		let resource: string;
		let requestMethod = 'POST';

		// For Post
		let body: IDataObject;

		for (let i = 0; i < items.length; i++) {
			const webhookUri = this.getNodeParameter('webhookUri', i) as string;
			body = {};

			resource = this.getNodeParameter('resource', i) as string;
			
			if (resource === 'webhook') {
				requestMethod = 'POST';
				body.content = this.getNodeParameter('text', i) as string;
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			const options = {
				method: requestMethod,
				body,
				uri: `${webhookUri}`,
				headers: {
					'content-type': 'application/json; charset=utf-8'
				},
				json: true
			};

			try {
				responseData = await this.helpers.request(options);
			} catch (error) {
				if (error.statusCode === 429) {
					// Waiting rating limit
					setTimeout(async () => {
						responseData = await this.helpers.request(options)
					}, 
					error.response.body.retry_after);
				}else {
					// If it's another error code then return the JSON response
					throw error;
				}
			}

			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
