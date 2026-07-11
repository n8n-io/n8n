import type {
	INodeType,
	INodeTypeDescription,
	ITriggerFunctions,
	ITriggerResponse,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeApiError } from 'n8n-workflow';

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
				displayName: 'Queue Name or ID',
				name: 'queueName',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getQueues',
				},
				displayOptions: {
					show: {
						queueType: ['name'],
					},
				},
				options: [],
				default: '',
				required: true,
				description:
					'Queue to receive messages from. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Poll Interval (Minutes)',
				name: 'pollIntervalMinutes',
				type: 'number',
				typeOptions: {
					minValue: 0,
				},
				default: 1,
				description:
					'Delay between polls (in minutes). Note: The actual interval includes this delay plus the SQS long polling wait time (default 20 seconds). Set to 0 for continuous polling with minimal delay.',
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
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
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

	methods = {
		loadOptions: {
			// Get all the available queues to display them to user so that it can be selected easily
			async getQueues(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const params = ['Version=2012-11-05', 'Action=ListQueues'];

				let data;
				try {
					// loads first 1000 queues from SQS
					data = await awsApiRequestSOAP.call(this, 'sqs', 'GET', `?${params.join('&')}`);
				} catch (error) {
					throw new NodeApiError(this.getNode(), error as JsonObject);
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
		const queueType = this.getNodeParameter('queueType') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;

		let queueUrl: string;

		if (queueType === 'url') {
			queueUrl = this.getNodeParameter('queueUrl') as string;
		} else {
			// When using Queue Name dropdown, the value is already the full queue URL
			queueUrl = this.getNodeParameter('queueName') as string;
		}

		const pollIntervalMinutes = this.getNodeParameter('pollIntervalMinutes', 1) as number;
		const pollInterval = pollIntervalMinutes * 60 * 1000; // Convert minutes to milliseconds
		const maxNumberOfMessages = this.getNodeParameter('maxNumberOfMessages', 10) as number;
		const waitTimeSeconds = this.getNodeParameter('waitTimeSeconds', 20) as number;
		const visibilityTimeout = this.getNodeParameter('visibilityTimeout', 30) as number;
		const deleteAfterProcessing = this.getNodeParameter('deleteAfterProcessing', true) as boolean;
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
					error: error instanceof Error ? error.message : String(error),
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
					// Always wait at least 1 second between polls to avoid API hammering
					// For intervals > 0, use the configured interval instead
					const delay = pollInterval > 0 ? pollInterval : 1000;
					await new Promise((resolve) => setTimeout(resolve, delay));
				} catch (error) {
					this.logger.error('Unexpected error in polling loop', {
						error: error instanceof Error ? error.message : String(error),
					});
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

// Type guard to check if value is a valid attribute object
function isValidAttribute(
	attr: unknown,
): attr is { Name: string; Value: string | number | boolean | IDataObject } {
	return (
		typeof attr === 'object' &&
		attr !== null &&
		'Name' in attr &&
		'Value' in attr &&
		typeof (attr as { Name: unknown }).Name === 'string'
	);
}

// Type guard to check if value is a valid message attribute value object
function isValidMessageAttributeValue(
	value: unknown,
): value is { StringValue?: string; BinaryValue?: string } {
	return typeof value === 'object' && value !== null;
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
			if (isValidAttribute(attr)) {
				attributes[attr.Name] = attr.Value;
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
			if (isValidAttribute(attr) && isValidMessageAttributeValue(attr.Value)) {
				const value = attr.Value;
				attrs[attr.Name] = value.StringValue ?? value.BinaryValue ?? value;
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
