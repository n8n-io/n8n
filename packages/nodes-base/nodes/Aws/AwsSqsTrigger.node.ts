import type {
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
	IDataObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { awsApiRequestSOAP } from './GenericFunctions';
import { awsNodeAuthOptions, awsNodeCredentials } from './utils';

export class AwsSqsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS SQS Trigger',
		name: 'awsSqsTrigger',
		icon: 'file:sqs.svg',
		group: ['trigger'],
		version: 1,
		subtitle: '={{$parameter["queueUrl"]}}',
		description: 'Consume messages from AWS SQS',
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
				displayName: 'Queue Type',
				name: 'queueType',
				type: 'options',
				options: [
					{
						name: 'Queue URL',
						value: 'url',
					},
					{
						name: 'Queue Name',
						value: 'name',
					},
				],
				default: 'url',
				description: 'Whether to specify queue by URL or name',
			},
			{
				displayName: 'Queue URL',
				name: 'queueUrl',
				type: 'string',
				displayOptions: {
					show: {
						queueType: ['url'],
					},
				},
				default: '',
				required: true,
				placeholder: 'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue',
				description: 'The URL of the Amazon SQS queue',
			},
			{
				displayName: 'Queue Name',
				name: 'queueName',
				type: 'string',
				displayOptions: {
					show: {
						queueType: ['name'],
					},
				},
				default: '',
				required: true,
				placeholder: 'my-queue',
				description: 'The name of the Amazon SQS queue',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Poll Interval (Minutes)',
						name: 'pollIntervalMinutes',
						type: 'number',
						typeOptions: {
							minValue: 0,
						},
						default: 1,
						description:
							'How often to check for messages (in minutes). Use 1 for every minute, 5 for every 5 minutes, etc. Set to 0 for continuous polling.',
					},
					{
						displayName: 'Max Number of Messages',
						name: 'maxNumberOfMessages',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 10,
						},
						default: 10,
						description: 'Maximum number of messages to retrieve per poll (1-10)',
					},
					{
						displayName: 'Wait Time Seconds',
						name: 'waitTimeSeconds',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 20,
						},
						default: 20,
						description:
							'Long polling wait time in seconds (0-20). Use 20 for efficient long polling to reduce API calls and costs.',
					},
					{
						displayName: 'Visibility Timeout',
						name: 'visibilityTimeout',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 43200,
						},
						default: 30,
						description: 'How long (in seconds) the message is hidden from other consumers',
					},
					{
						displayName: 'Delete After Processing',
						name: 'deleteAfterProcessing',
						type: 'boolean',
						default: true,
						description: 'Whether to automatically delete messages after successful processing',
					},
					{
						displayName: 'Emit Items Individually',
						name: 'emitIndividually',
						type: 'boolean',
						default: true,
						description: 'Whether to emit each message as a separate execution or as a batch',
					},
				],
			},
		],
	};

	async trigger(this: ITriggerFunctions): Promise<ITriggerResponse> {
		const queueType = this.getNodeParameter('queueType') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;

		let queueUrl: string;

		if (queueType === 'url') {
			queueUrl = this.getNodeParameter('queueUrl') as string;
		} else {
			const queueName = this.getNodeParameter('queueName') as string;
			const credentials = await this.getCredentials('aws');
			const region = credentials.region as string;
			const accountId = (credentials.accountId as string) || '';

			if (!accountId) {
				throw new NodeOperationError(
					this.getNode(),
					'Account ID is required when using Queue Name. Please use Queue URL instead or provide Account ID in credentials.',
				);
			}

			queueUrl = `https://sqs.${region}.amazonaws.com/${accountId}/${queueName}`;
		}

		const maxNumberOfMessages = (options.maxNumberOfMessages as number) ?? 10;
		const waitTimeSeconds = (options.waitTimeSeconds as number) ?? 20;
		const pollIntervalMinutes = (options.pollIntervalMinutes as number) ?? 1;
		const pollInterval = pollIntervalMinutes * 60 * 1000; // Convert minutes to milliseconds
		const visibilityTimeout = (options.visibilityTimeout as number) ?? 30;
		const deleteAfterProcessing = options.deleteAfterProcessing !== false;
		const emitIndividually = options.emitIndividually !== false;

		const pollMessages = async () => {
			try {
				const params = [
					`QueueUrl=${encodeURIComponent(queueUrl)}`,
					`MaxNumberOfMessages=${maxNumberOfMessages}`,
					`WaitTimeSeconds=${waitTimeSeconds}`,
					`VisibilityTimeout=${visibilityTimeout}`,
					'AttributeName.1=All',
					'MessageAttributeName.1=All',
					'Version=2012-11-05',
				];

				const response = await awsApiRequestSOAP.call(
					this,
					'sqs',
					'GET',
					`/?Action=ReceiveMessage&${params.join('&')}`,
				);

				const messages = response?.ReceiveMessageResponse?.ReceiveMessageResult?.Message;

				if (messages) {
					// Ensure messages is an array
					const messageArray = Array.isArray(messages) ? messages : [messages];

					if (emitIndividually) {
						// Emit each message individually
						for (const message of messageArray) {
							const item = formatMessage(message);
							this.emit([this.helpers.returnJsonArray([item])]);

							// Delete message if configured
							if (deleteAfterProcessing && message.ReceiptHandle) {
								await deleteMessage.call(this, queueUrl, message.ReceiptHandle);
							}
						}
					} else {
						// Emit all messages as a batch
						const items = messageArray.map(formatMessage);
						this.emit([this.helpers.returnJsonArray(items)]);

						// Delete messages if configured
						if (deleteAfterProcessing) {
							for (const message of messageArray) {
								if (message.ReceiptHandle) {
									await deleteMessage.call(this, queueUrl, message.ReceiptHandle);
								}
							}
						}
					}
				}
			} catch (error) {
				if (this.getMode() === 'manual') {
					throw error;
				}
				// In production mode, log the error but don't crash
				this.logger.error('Error polling SQS queue', {
					error: error.message,
					queueUrl,
				});
			}
		};

		// Manual execution mode - run once and return
		if (this.getMode() === 'manual') {
			async function manualTriggerFunction() {
				await pollMessages();
			}

			return {
				closeFunction: async () => {},
				manualTriggerFunction,
			};
		}

		// Production mode - set up continuous polling with optional interval
		let shouldStopPolling = false;
		const startPolling = async () => {
			while (!shouldStopPolling) {
				try {
					await pollMessages();
					if (pollInterval > 0) {
						await new Promise((resolve) => setTimeout(resolve, pollInterval));
					}
				} catch (error) {
					this.logger.error('Unexpected error in polling loop', { error: error.message });
					// Wait before retrying after error
					await new Promise((resolve) => setTimeout(resolve, 5000));
				}
			}
		};

		// Start polling loop
		void startPolling();

		// Cleanup function
		async function closeFunction() {
			shouldStopPolling = true;
		}

		return {
			closeFunction,
		};
	}
}

function formatMessage(message: IDataObject): IDataObject {
	const formattedMessage: IDataObject = {
		messageId: message.MessageId,
		receiptHandle: message.ReceiptHandle,
		body: message.Body,
		md5OfBody: message.MD5OfBody,
	};

	if (message.Attribute) {
		const attributes: IDataObject = {};
		const attrs = Array.isArray(message.Attribute) ? message.Attribute : [message.Attribute];
		for (const attr of attrs) {
			const attrObj = attr as IDataObject;
			if (attrObj.Name && attrObj.Value) {
				attributes[attrObj.Name as string] = attrObj.Value;
			}
		}
		formattedMessage.attributes = attributes;
	}

	if (message.MessageAttribute) {
		const attrs: IDataObject = {};
		const msgAttrs = Array.isArray(message.MessageAttribute)
			? message.MessageAttribute
			: [message.MessageAttribute];
		for (const attr of msgAttrs) {
			const attrObj = attr as IDataObject;
			if (attrObj.Name && attrObj.Value) {
				const valueObj = attrObj.Value as IDataObject;
				attrs[attrObj.Name as string] = valueObj.StringValue || valueObj.BinaryValue || valueObj;
			}
		}
		formattedMessage.messageAttributes = attrs;
	}

	// Try to parse body as JSON
	if (message.Body && typeof message.Body === 'string') {
		try {
			formattedMessage.bodyJson = JSON.parse(message.Body);
		} catch {
			// Body is not JSON, keep as string
		}
	}

	return formattedMessage;
}

async function deleteMessage(
	this: ITriggerFunctions,
	queueUrl: string,
	receiptHandle: string,
): Promise<void> {
	const params = [
		`QueueUrl=${encodeURIComponent(queueUrl)}`,
		`ReceiptHandle=${encodeURIComponent(receiptHandle)}`,
		'Version=2012-11-05',
	];

	await awsApiRequestSOAP.call(this, 'sqs', 'GET', `/?Action=DeleteMessage&${params.join('&')}`);
}
