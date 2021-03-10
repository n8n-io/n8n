import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { awsApiRequestSOAP } from '../GenericFunctions';

export class AwsSqs implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS SQS',
		name: 'awsSqs',
		icon: 'file:sqs.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["queue"]}}',
		description: 'Sends messages to AWS SQS',
		defaults: {
			name: 'AWS SQS',
			color: '#FF9900',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				options: [
					{
						name: 'Send message',
						value: 'SendMessage',
						description: 'Send a message to a queue',
					},
				],
				default: 'SendMessage',
				description: 'The operation to perform.',
			},
			{
				displayName: 'Queue URL',
				name: 'queue',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getQueues',
				},
				displayOptions: {
					show: {
						operation: [
							'SendMessage',
						],
					},
				},
				options: [],
				default: '',
				required: true,
				description: 'The queue you want to send message to',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				displayOptions: {
					show: {
						operation: [
							'SendMessage',
						],
					},
				},
				required: true,
				typeOptions: {
					alwaysOpenEditWindow: true,
				},
				default: '',
				description: 'The message you want to send',
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available queues to display them to user so that it can be selected easily
			async getQueues(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let data;
				try {
					data = await awsApiRequestSOAP.call(this, 'sqs', 'GET', `?Action=ListQueues`);
				} catch (err) {
					throw new Error(`AWS Error: ${err}`);
				}

				let queues = data.ListQueuesResponse.ListQueuesResult;

				if (!Array.isArray(queues)) {
					// If user has only a single queue no array get returned so we make
					// one manually to be able to process everything identically
					queues = [queues];
				}

				for (const queue of queues) {
                    const queueUrl = queue.QueueUrl;
                    const urlParts = queueUrl.split('/');
					const name = urlParts[urlParts.length - 1];

					returnData.push({
						name,
						value: queueUrl,
					});
				}

				return returnData;
			},
		},
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

        const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
            const queueUrl = this.getNodeParameter('queue', i) as string;
            const queuePath = queueUrl.split('.com/')[1];
			const params = [
				'MessageBody=' + this.getNodeParameter('message', i) as string,
			];

			let responseData;
			try {
				responseData = await awsApiRequestSOAP.call(this, 'sqs', 'GET', `/${queuePath}/?Action=${operation}&` + params.join('&'));
			} catch (err) {
				throw new Error(`AWS Error: ${err}`);
			}
			returnData.push({MessageId: responseData.SendMessageResponse.SendMessageResult.MessageId} as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
