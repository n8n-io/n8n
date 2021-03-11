import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeParameters,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { URL } from 'url';

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
				displayName: 'Queue',
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
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						operation: [
							'SendMessage',
						],
					},
				},
				default: {},
				placeholder: 'Add Option',
				options: [
					{
						displayName: 'Delay Seconds',
						name: 'delaySeconds',
						type: 'number',
						description: 'The length of time, in seconds, for which to delay a specific message.',
						default: 0,
						typeOptions: {
							minValue: 0,
							maxValue: 900,
						},
					},
					{
						displayName: 'Message Attributes',
						name: 'messageAttributes',
						placeholder: 'Add Attribute',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						description: 'The attributes to set.',
						default: {},
						options: [
							{
								name: 'binary',
								displayName: 'Binary',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of attribute.',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'The binary value of attribute.',
									},
								],
							},
							{
								name: 'number',
								displayName: 'Number',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of attribute',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'number',
										default: 0,
										description: 'The number value of attribute.',
									},
								],
							},
							{
								name: 'string',
								displayName: 'String',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of attribute',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'The string value of attribute.',
									},
								],
							},
						],
					},
					{
						displayName: 'MessageDeduplicationId',
						name: 'messageDeduplicationId',
						type: 'string',
						default: '',
						description: 'The token used for deduplication of sent messages. This parameter applies only to FIFO (first-in-first-out) queues.',
					},
					{
						displayName: 'MessageGroupId',
						name: 'messageGroupId',
						type: 'string',
						default: '',
						description: 'The tag that specifies that a message belongs to a specific message group. . This parameter applies only to FIFO (first-in-first-out) queues.',
					},
				],
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
					// loads first 1000 queues from SQS
					data = await awsApiRequestSOAP.call(this, 'sqs', 'GET', `?Action=ListQueues`);
				} catch (err) {
					throw new Error(`AWS Error: ${err}`);
				}

				let queues = data.ListQueuesResponse.ListQueuesResult.QueueUrl;
				if (!queues) {
					return returnData;
				}

				if (!Array.isArray(queues)) {
					// If user has only a single queue no array get returned so we make
					// one manually to be able to process everything identically
					queues = [queues];
				}

				for (const queueUrl of queues) {
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
			const queuePath = new URL(queueUrl).pathname;
			const params = [
				'MessageBody=' + this.getNodeParameter('message', i) as string,
			];

			const options = this.getNodeParameter('options', i, {}) as IDataObject;

			if (options.delaySeconds) {
				params.push(`DelaySeconds=${options.delaySeconds}`);
			}

			if (options.messageDeduplicationId) {
				params.push(`MessageDeduplicationId=${options.messageDeduplicationId}`);
			}

			if (options.messageGroupId) {
				params.push(`MessageGroupId=${options.messageGroupId}`);
			}

			let attributeCount = 0;
			// Add string values
			(this.getNodeParameter('options.messageAttributes.string', i, []) as INodeParameters[]).forEach((attribute) => {
				attributeCount++;
				params.push(`MessageAttribute.${attributeCount}.Name=${attribute.name}`);
				params.push(`MessageAttribute.${attributeCount}.Value.StringValue=${attribute.value}`);
				params.push(`MessageAttribute.${attributeCount}.Value.DataType=String`);
			});

			// Add binary values
			(this.getNodeParameter('options.messageAttributes.binary', i, []) as INodeParameters[]).forEach((attribute) => {
				attributeCount++;
				params.push(`MessageAttribute.${attributeCount}.Name=${attribute.name}`);
				params.push(`MessageAttribute.${attributeCount}.Value.BinaryValue=${attribute.value}`);
				params.push(`MessageAttribute.${attributeCount}.Value.DataType=Binary`);
			});

			// Add number values
			(this.getNodeParameter('options.messageAttributes.number', i, []) as INodeParameters[]).forEach((attribute) => {
				attributeCount++;
				params.push(`MessageAttribute.${attributeCount}.Name=${attribute.name}`);
				params.push(`MessageAttribute.${attributeCount}.Value.StringValue=${attribute.value}`);
				params.push(`MessageAttribute.${attributeCount}.Value.DataType=Number`);
			});

			let responseData;
			try {
				responseData = await awsApiRequestSOAP.call(this, 'sqs', 'GET', `${queuePath}/?Action=${operation}&` + params.join('&'));
			} catch (err) {
				throw new Error(`AWS Error: ${err}`);
			}

			const result = responseData.SendMessageResponse.SendMessageResult;
			returnData.push(result as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
