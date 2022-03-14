import { get } from 'lodash';
import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

export class Discord implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Discord',
		name: 'discord',
		icon: 'file:discord.png',
		group: ['output'],
		version: 1,
		description: 'Sends data to Discord',
		defaults: {
			name: 'Discord',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Webhook URL',
				name: 'webhookUri',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'The webhook url.',
			},
			{
				displayName: 'Text',
				name: 'text',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'The text to send.',
			},
		],
	};



	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const requestMethod = 'POST';

		// For Post
		let body: IDataObject;

		for (let i = 0; i < items.length; i++) {
			const webhookUri = this.getNodeParameter('webhookUri', i) as string;
			body = {};

			body.content = this.getNodeParameter('text', i) as string;

			const options = {
				method: requestMethod,
				body,
				uri: `${webhookUri}`,
				headers: {
					'content-type': 'application/json; charset=utf-8',
				},
				json: true,
			};

			let maxTries = 5;
			do {
				try {
					await this.helpers.request(options);
					break;
				} catch (error) {
					if (error.statusCode === 429) {
						// Waiting rating limit
						await new Promise((resolve) => {
							setTimeout(async () => {
								// @ts-ignore
								resolve();
							}, get(error, 'response.body.retry_after', 150));
						});
					} else {
						throw new NodeApiError(this.getNode(), error);
					}
				}

			} while (--maxTries);

			if (maxTries <= 0) {
				throw new NodeApiError(this.getNode(), { request: options } as JsonObject, { message: 'Could not send message. Max. amount of rate-limit retries got reached.' });
			}

			returnData.push({success: true});
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
