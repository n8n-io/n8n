import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';
import { URL } from 'url';

import { awsApiRequestSOAP } from '../GenericFunctions';
import { awsNodeAuthOptions, awsNodeCredentials } from '../utils';

export class AwsSqsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS SQS Trigger',
		name: 'awsSqsTrigger',
		icon: 'file:sqs.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when an AWS SQS message is received',
		subtitle: '={{$parameter["queue"]}}',
		defaults: {
			name: 'AWS SQS Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: awsNodeCredentials,
		polling: true,
		properties: [
			awsNodeAuthOptions,
			{
				displayName: 'Queue Name or ID',
				name: 'queue',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getQueues',
				},
				options: [],
				default: '',
				required: true,
				description:
					'Queue to poll for messages. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Max Number of Messages',
				name: 'maxNumberOfMessages',
				type: 'number',
				default: 1,
				description: 'Maximum number of messages to return per poll (1-10)',
				typeOptions: {
					minValue: 1,
					maxValue: 10,
				},
			},
			{
				displayName: 'Auto-Delete Messages',
				name: 'deleteAfterReceive',
				type: 'boolean',
				default: false,
				description:
					'Whether to automatically delete messages from the queue after they are received',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add option',
				options: [
					{
						displayName: 'Visibility Timeout',
						name: 'visibilityTimeout',
						type: 'number',
						default: 30,
						description:
							'How long, in seconds, the received messages are hidden from subsequent retrieve requests',
						typeOptions: {
							minValue: 0,
							maxValue: 43200,
						},
					},
					{
						displayName: 'Wait Time Seconds',
						name: 'waitTimeSeconds',
						type: 'number',
						default: 0,
						description:
							'How long, in seconds, to wait for messages to arrive (long polling). Set to 0 for short polling.',
						typeOptions: {
							minValue: 0,
							maxValue: 20,
						},
					},
				],
			},
		],
	};

	methods = {
		loadOptions: {
			async getQueues(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const params = ['Version=2012-11-05', 'Action=ListQueues'];

				let data;
				try {
					data = await awsApiRequestSOAP.call(this, 'sqs', 'GET', `?${params.join('&')}`);
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}

				let queues = data.ListQueuesResponse.ListQueuesResult.QueueUrl;
				if (!queues) {
					return [];
				}

				if (!Array.isArray(queues)) {
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

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const queueUrl = this.getNodeParameter('queue') as string;
		const queuePath = new URL(queueUrl).pathname;
		const maxNumberOfMessages = this.getNodeParameter('maxNumberOfMessages') as number;
		const deleteAfterReceive = this.getNodeParameter('deleteAfterReceive') as boolean;
		const options = this.getNodeParameter('options') as IDataObject;

		const visibilityTimeout = (options.visibilityTimeout ?? 30) as number;
		const waitTimeSeconds = (options.waitTimeSeconds ?? 0) as number;

		const params = [
			'Version=2012-11-05',
			'Action=ReceiveMessage',
			`MaxNumberOfMessages=${maxNumberOfMessages}`,
			`VisibilityTimeout=${visibilityTimeout}`,
			`WaitTimeSeconds=${waitTimeSeconds}`,
			'AttributeName.1=All',
			'MessageAttributeName.1=All',
		];

		let responseData;
		try {
			responseData = await awsApiRequestSOAP.call(
				this,
				'sqs',
				'GET',
				`${queuePath}?${params.join('&')}`,
			);
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}

		let messages = responseData.ReceiveMessageResponse?.ReceiveMessageResult?.Message;
		if (!messages) {
			return null;
		}

		if (!Array.isArray(messages)) {
			messages = [messages];
		}

		// Deduplicate using workflow static data
		const webhookData = this.getWorkflowStaticData('node');
		const previousMessageIds = (webhookData.processedMessageIds as string[]) ?? [];
		const previousIdSet = new Set(previousMessageIds);

		const isManualMode = this.getMode() === 'manual';
		const newMessages: IDataObject[] = [];

		for (const message of messages as IDataObject[]) {
			const messageId = message.MessageId as string;

			if (!isManualMode && previousIdSet.has(messageId)) {
				continue;
			}

			newMessages.push(message);
		}

		if (newMessages.length === 0) {
			return null;
		}

		// Delete messages if configured
		if (deleteAfterReceive) {
			for (const message of newMessages) {
				const receiptHandle = message.ReceiptHandle as string;
				const deleteParams = [
					'Version=2012-11-05',
					'Action=DeleteMessage',
					`ReceiptHandle=${encodeURIComponent(receiptHandle)}`,
				];

				try {
					await awsApiRequestSOAP.call(
						this,
						'sqs',
						'GET',
						`${queuePath}?${deleteParams.join('&')}`,
					);
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject);
				}
			}
		}

		// Update static data with current message IDs for deduplication
		if (!isManualMode) {
			webhookData.processedMessageIds = newMessages.map((m) => m.MessageId as string);
		}

		return [this.helpers.returnJsonArray(newMessages)];
	}
}
