import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
} from 'n8n-workflow';

interface Attachment {
	fields: {
		item?: object[];
	};
}

export class DiscordWebhook implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Discord Webhook',
		name: 'discordwebhook',
		icon: 'file:discord.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Sends data to Discord',
		defaults: {
			name: 'Discord Webhook',
			color: '#BB2244',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'discordApi',
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
						name: 'Message',
						value: 'message',
					},
				],
				default: 'message',
				description: 'The resource to operate on.',
			},



			// ----------------------------------
			//         operations
			// ----------------------------------
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
						name: 'Post',
						value: 'post',
						description: 'Post a message into a channel',
					},
				],
				default: 'post',
				description: 'The operation to perform.',
			},

			// ----------------------------------
			//         message
			// ----------------------------------

			// ----------------------------------
			//         message:post
			// ----------------------------------
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
						operation: [
							'post'
						],
						resource: [
							'message',
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

		const credentials = this.getCredentials('discordApi');

		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		let operation: string;
		let resource: string;
		let requestMethod = 'POST';

		// For Post
		let body: IDataObject;
		// For Query string
		let qs: IDataObject;

		for (let i = 0; i < items.length; i++) {
			body = {};
			qs = {};

			resource = this.getNodeParameter('resource', i) as string;
			operation = this.getNodeParameter('operation', i) as string;
			
			if (resource === 'message') {
				if (operation === 'post') {
					// ----------------------------------
					//         message:post
					// ----------------------------------

					requestMethod = 'POST';
					body.content = this.getNodeParameter('text', i) as string;

					const attachments = this.getNodeParameter('attachments', i, []) as unknown as Attachment[];

					// The node does save the fields data differently than the API
					// expects so fix the data befre we send the request
					for (const attachment of attachments) {
						if (attachment.fields !== undefined) {
							if (attachment.fields.item !== undefined) {
								// Move the field-content up
								// @ts-ignore
								attachment.fields = attachment.fields.item;
							} else {
								// If it does not have any items set remove it
								delete attachment.fields;
							}
						}
					}
					body['attachments'] = attachments;
				}
			} else {
				throw new Error(`The resource "${resource}" is not known!`);
			}

			const options = {
				method: requestMethod,
				body,
				qs,
				uri: `${credentials.webhookUri}`,
				headers: {
					'content-type': 'application/json; charset=utf-8'
				},
				json: true
			};

			const responseData = await this.helpers.request(options);

			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
