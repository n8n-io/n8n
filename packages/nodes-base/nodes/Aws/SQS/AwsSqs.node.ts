import { pascalCase } from 'change-case';
import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeParameters,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes } from 'n8n-workflow';
import { URL } from 'url';

import { awsApiRequestSOAP } from '../GenericFunctions';
import { awsNodeAuthOptions, awsNodeCredentials } from '../utils';

export class AwsSqs implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS SQS',
		name: 'awsSqs',
		icon: 'file:sqs.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Send and receive messages from AWS SQS',
		defaults: {
			name: 'AWS SQS',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: awsNodeCredentials,
		properties: [
			awsNodeAuthOptions,
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Receive Message',
						value: 'receiveMessage',
						description: 'Receive messages from a queue',
						action: 'Receive messages from a queue',
					},
					{
						name: 'Send Message',
						value: 'sendMessage',
						description: 'Send a message to a queue',
						action: 'Send a message to a queue',
					},
				],
				default: 'sendMessage',
			},
			{
				displayName: 'Queue Name or ID',
				name: 'queue',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getQueues',
				},
				displayOptions: {
					show: {
						operation: ['sendMessage', 'receiveMessage'],
					},
				},
				options: [],
				default: '',
				required: true,
				description:
					'Queue to use. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
			},
			{
				displayName: 'Options',
				name: 'receiveOptions',
				type: 'collection',
				placeholder: 'Add Option',
				displayOptions: {
					show: {
						operation: ['receiveMessage'],
					},
				},
				default: {},
				options: [
					{
						displayName: 'Max Number of Messages',
						name: 'maxNumberOfMessages',
						type: 'number',
						typeOptions: {
							minValue: 1,
							maxValue: 10,
						},
						default: 1,
						description: 'Maximum number of messages to retrieve (1-10)',
					},
					{
						displayName: 'Wait Time Seconds',
						name: 'waitTimeSeconds',
						type: 'number',
						typeOptions: {
							minValue: 0,
							maxValue: 20,
						},
						default: 0,
						description:
							'Long polling wait time in seconds (0-20). Use higher values to reduce empty responses.',
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
						displayName: 'Delete After Receive',
						name: 'deleteAfterReceive',
						type: 'boolean',
						default: false,
						description:
							'Whether to automatically delete messages after receiving them. Use with caution!.',
					},
				],
			},
			{
				displayName: 'Queue Type',
				name: 'queueType',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['sendMessage'],
					},
				},
				options: [
					{
						name: 'FIFO',
						value: 'fifo',
						description: 'FIFO SQS queue',
					},
					{
						name: 'Standard',
						value: 'standard',
						description: 'Standard SQS queue',
					},
				],
				default: 'standard',
			},
			{
				displayName: 'Send Input Data',
				name: 'sendInputData',
				type: 'boolean',
				default: true,
				description: 'Whether to send the data the node receives as JSON to SQS',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['sendMessage'],
						sendInputData: [false],
					},
				},
				required: true,
				default: '',
				description: 'Message to send to the queue',
			},
			{
				displayName: 'Message Group ID',
				name: 'messageGroupId',
				type: 'string',
				default: '',
				description:
					'Tag that specifies that a message belongs to a specific message group. Applies only to FIFO (first-in-first-out) queues.',
				displayOptions: {
					show: {
						queueType: ['fifo'],
					},
				},
				required: true,
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				displayOptions: {
					show: {
						operation: ['sendMessage'],
					},
				},
				default: {},
				placeholder: 'Add option',
				options: [
					{
						displayName: 'Delay Seconds',
						name: 'delaySeconds',
						type: 'number',
						displayOptions: {
							show: {
								'/queueType': ['standard'],
							},
						},
						description: 'How long, in seconds, to delay a message for',
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
						description: 'Attributes to set',
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
										description: 'Name of the attribute',
									},
									{
										displayName: 'Property Name',
										name: 'dataPropertyName',
										type: 'string',
										default: 'data',
										description:
											'Name of the binary property which contains the data for the message attribute',
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
										description: 'Name of the attribute',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'number',
										default: 0,
										description: 'Number value of the attribute',
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
										description: 'Name of the attribute',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'String value of attribute',
									},
								],
							},
						],
					},
					{
						displayName: 'Message Deduplication ID',
						name: 'messageDeduplicationId',
						type: 'string',
						default: '',
						description:
							'Token used for deduplication of sent messages. Applies only to FIFO (first-in-first-out) queues.',
						displayOptions: {
							show: {
								'/queueType': ['fifo'],
							},
						},
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const operation = this.getNodeParameter('operation', 0);

		if (operation === 'receiveMessage') {
			// Receive message operation
			for (let i = 0; i < items.length; i++) {
				try {
					const queueUrl = this.getNodeParameter('queue', i) as string;
					const queuePath = new URL(queueUrl).pathname;

					const receiveOptions = this.getNodeParameter('receiveOptions', i, {}) as IDataObject;

					const params = [
						'Version=2012-11-05',
						'Action=ReceiveMessage',
						`MaxNumberOfMessages=${receiveOptions.maxNumberOfMessages || 1}`,
						`WaitTimeSeconds=${receiveOptions.waitTimeSeconds || 0}`,
						`VisibilityTimeout=${receiveOptions.visibilityTimeout ?? 30}`,
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

					const messages = responseData?.ReceiveMessageResponse?.ReceiveMessageResult?.Message;

					if (messages) {
						// Ensure messages is an array
						const messageArray = Array.isArray(messages) ? messages : [messages];

						for (const message of messageArray) {
							const formattedMessage = formatMessage(message);
							returnData.push(formattedMessage);

							// Delete message if configured
							if (receiveOptions.deleteAfterReceive && message.ReceiptHandle) {
								const deleteParams = [
									'Version=2012-11-05',
									'Action=DeleteMessage',
									`ReceiptHandle=${encodeURIComponent(message.ReceiptHandle)}`,
								];

								try {
									await awsApiRequestSOAP.call(
										this,
										'sqs',
										'GET',
										`${queuePath}?${deleteParams.join('&')}`,
									);
								} catch (error) {
									// Log but don't fail if delete fails
									this.logger.warn('Failed to delete message after receive', {
										error: (error as Error).message,
									});
								}
							}
						}
					}
				} catch (error) {
					if (this.continueOnFail()) {
						returnData.push({ error: (error as Error).message });
						continue;
					}
					throw error;
				}
			}

			return [this.helpers.returnJsonArray(returnData)];
		}

		// Send message operation
		for (let i = 0; i < items.length; i++) {
			try {
				const queueUrl = this.getNodeParameter('queue', i) as string;
				const queuePath = new URL(queueUrl).pathname;

				const params = ['Version=2012-11-05', `Action=${pascalCase(operation)}`];

				const options = this.getNodeParameter('options', i, {});
				const sendInputData = this.getNodeParameter('sendInputData', i) as boolean;

				let message = sendInputData
					? JSON.stringify(items[i].json)
					: this.getNodeParameter('message', i);

				// This prevents [object Object] from being sent as message when sending json in an expression
				if (typeof message === 'object') {
					message = JSON.stringify(message);
				}

				params.push(`MessageBody=${encodeURIComponent(message as string)}`);

				if (options.delaySeconds) {
					params.push(`DelaySeconds=${options.delaySeconds}`);
				}

				const queueType = this.getNodeParameter('queueType', i, {}) as string;
				if (queueType === 'fifo') {
					const messageDeduplicationId = this.getNodeParameter(
						'options.messageDeduplicationId',
						i,
						'',
					) as string;
					if (messageDeduplicationId) {
						params.push(`MessageDeduplicationId=${messageDeduplicationId}`);
					}

					const messageGroupId = this.getNodeParameter('messageGroupId', i) as string;
					if (messageGroupId) {
						params.push(`MessageGroupId=${messageGroupId}`);
					}
				}

				let attributeCount = 0;
				// Add string values
				(
					this.getNodeParameter('options.messageAttributes.string', i, []) as INodeParameters[]
				).forEach((attribute) => {
					attributeCount++;
					params.push(`MessageAttribute.${attributeCount}.Name=${attribute.name}`);
					params.push(`MessageAttribute.${attributeCount}.Value.StringValue=${attribute.value}`);
					params.push(`MessageAttribute.${attributeCount}.Value.DataType=String`);
				});

				// Add binary values
				(
					this.getNodeParameter('options.messageAttributes.binary', i, []) as INodeParameters[]
				).forEach((attribute) => {
					attributeCount++;

					const dataPropertyName = attribute.dataPropertyName as string;
					const binaryData = this.helpers.assertBinaryData(i, dataPropertyName);

					params.push(`MessageAttribute.${attributeCount}.Name=${attribute.name}`);
					params.push(`MessageAttribute.${attributeCount}.Value.BinaryValue=${binaryData.data}`);
					params.push(`MessageAttribute.${attributeCount}.Value.DataType=Binary`);
				});

				// Add number values
				(
					this.getNodeParameter('options.messageAttributes.number', i, []) as INodeParameters[]
				).forEach((attribute) => {
					attributeCount++;
					params.push(`MessageAttribute.${attributeCount}.Name=${attribute.name}`);
					params.push(`MessageAttribute.${attributeCount}.Value.StringValue=${attribute.value}`);
					params.push(`MessageAttribute.${attributeCount}.Value.DataType=Number`);
				});

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

				const result = responseData.SendMessageResponse.SendMessageResult;
				returnData.push(result as IDataObject);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.description });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
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
