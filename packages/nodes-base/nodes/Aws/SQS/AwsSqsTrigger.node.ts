import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	ITriggerResponse,
	NodeApiError,
	NodeOperationError
} from 'n8n-workflow';

import { ITriggerFunctions } from 'n8n-core';

import {
	awsApiRequestSOAP,
} from '../GenericFunctions';

export class AwsSqsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS SQS Trigger',
		name: 'awsSqsTrigger',
		icon: 'file:sqs.svg',
		group: ['trigger'],
		version: 1,
		subtitle: `={{$parameter["queue"]}}`,
		description: 'Consume queue messages from AWS SQS',
		defaults: {
			name: 'AWS SQS Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Queue',
				name: 'queue',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getQueues',
				},
				options: [],
				default: '',
				required: true,
				description: 'Queue to receive messages from',
			},
			{
				displayName: 'Interval',
				name: 'interval',
				type: 'number',
				typeOptions: {
					minValue: 1,
				},
				default: 1,
				description: 'Interval value which the queue will be checked for new messages',
			},
			{
				displayName: 'Unit',
				name: 'unit',
				type: 'options',
				options: [
					{
						name: 'Seconds',
						value: 'seconds',
					},
					{
						name: 'Minutes',
						value: 'minutes',
					},
					{
						name: 'Hours',
						value: 'hours',
					},
				],
				default: 'seconds',
				description: 'Unit of the interval value',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Delete Messages',
						name: 'deleteMessages',
						type: 'boolean',
						default: true,
						description: 'Whether to delete messages after receiving them',
					},
					{
						displayName: 'Visibility Timeout',
						name: 'visibilityTimeout',
						type: 'number',
						default: 30,
						description: 'The duration (in seconds) that the received messages are hidden from subsequent retrieve requests after being retrieved by a receive message request',
					},
					{
						displayName: 'Max Number Of Messages',
						name: 'maxNumberOfMessages',
						type: 'number',
						default: 1,
						description: 'Maximum number of messages to return. SQS never returns more messages than this value but might return fewer.',
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the available queues to display them to user so that it can be selected easily
			async getQueues(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const params = [
					'Version=2012-11-05',
					`Action=ListQueues`,
				];

				let data;
				try {
					// loads first 1000 queues from SQS
					data = await awsApiRequestSOAP.call(this, 'sqs', 'GET', `?${params.join('&')}`);
				} catch (error) {
					throw new NodeApiError(this.getNode(), error);
				}

				let queues = data.ListQueuesResponse.ListQueuesResult.QueueUrl;
				if (!queues) {
					return [];
				}

				if (!Array.isArray(queues)) {
					// If user has only a single queue no array get returned so we make
					// one manually to be able to process everything identically
					queues = [queues];
				}

				return queues.map((queueUrl: string) => {
					const urlParts = queueUrl.split('/');
					const name = urlParts[urlParts.length - 1];

					return {
						name,
						value: queueUrl,
					};
				});
			},
		},
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const queueUrl = this.getNodeParameter('queue') as string;
		const queuePath = new URL(queueUrl).pathname;

		const interval = this.getNodeParameter('interval') as number;
		const unit = this.getNodeParameter('unit') as string;

		const options = this.getNodeParameter('options', {}) as IDataObject;

		const receiveMessageParams = [
			'Version=2012-11-05',
			`Action=ReceiveMessage`,
		];

		if (options.visibilityTimeout) {
			receiveMessageParams.push(`VisibilityTimeout=${options.visibilityTimeout}`);
		}

		if (options.maxNumberOfMessages) {
			receiveMessageParams.push(`MaxNumberOfMessages=${options.maxNumberOfMessages}`);
		}

		if (interval <= 0) {
			throw new NodeOperationError(this.getNode(), 'The interval has to be set to at least 1 or higher!');
		}

		let intervalValue = interval;
		if (unit === 'minutes') {
			intervalValue *= 60;
		}
		if (unit === 'hours') {
			intervalValue *= 60 * 60;
		}

		const executeTrigger = async () => {	
			try {
				const responseData = await awsApiRequestSOAP.call(this, 'sqs', 'GET', `${queuePath}?${receiveMessageParams.join('&')}`);
				const receiveMessageResult = responseData.ReceiveMessageResponse.ReceiveMessageResult;
				const multipleMessagesReceived = Array.isArray(receiveMessageResult.Message);
	
				if (receiveMessageResult !== '') {
					let returnMessages: INodeExecutionData[] = [];

					if (multipleMessagesReceived) {
						returnMessages = receiveMessageResult.Message.map((message: {}) => 
							{
								return {json: message};
							},
						);
					} else {
						returnMessages.push({json: receiveMessageResult.Message});
					}

					if (options.deleteMessages) {
						const deleteMessagesParams = [
							'Version=2012-11-05',
						];

						if (multipleMessagesReceived) {
							deleteMessagesParams.push(`Action=DeleteMessageBatch`);

							for (let i = 0; i < receiveMessageResult.Message.length; i++) {
								const deleteMessageBatchRequestId = (i + 1);
								const deleteMessageBatchRequestEntry = `DeleteMessageBatchRequestEntry.${deleteMessageBatchRequestId}`;

								deleteMessagesParams.push(
									`${deleteMessageBatchRequestEntry}.Id=msg${deleteMessageBatchRequestId}`,
									`${deleteMessageBatchRequestEntry}.ReceiptHandle=${encodeURIComponent(receiveMessageResult.Message[i].ReceiptHandle)}`,
								);
							}
						} else {
							deleteMessagesParams.push(
								`Action=DeleteMessage`,
								`ReceiptHandle=${encodeURIComponent(receiveMessageResult.Message.ReceiptHandle)}`,
							);
						}

						await awsApiRequestSOAP.call(this, 'sqs', 'GET', `${queuePath}?${deleteMessagesParams.join('&')}`);
					}

					this.emit([returnMessages]);
				}
			} catch (error) {
				throw new NodeApiError(this.getNode(), error);
			}
		};

		intervalValue *= 1000;

		// Reference: https://nodejs.org/api/timers.html#timers_setinterval_callback_delay_args
		if (intervalValue > 2147483647) {
			throw new NodeApiError(this.getNode(), {message: 'The interval value is too large.'});
		}

		const intervalObj = setInterval(executeTrigger, intervalValue);

		async function closeFunction() {
			clearInterval(intervalObj);
		}

		async function manualTriggerFunction() {
			executeTrigger();
		}

		return {
			closeFunction,
			manualTriggerFunction,
		};
	}
}
