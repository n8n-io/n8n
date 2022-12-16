import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchItems,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { awsApiRequestSOAP } from './GenericFunctions';

export class AwsSns implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS SNS',
		name: 'awsSns',
		icon: 'file:sns.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["topic"]}}',
		description: 'Sends data to AWS SNS',
		defaults: {
			name: 'AWS SNS',
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
				noDataExpression: true,
				options: [
					{
						name: 'Create',
						value: 'create',
						description: 'Create a topic',
						action: 'Create a topic',
					},
					{
						name: 'Delete',
						value: 'delete',
						description: 'Delete a topic',
						action: 'Delete a topic',
					},
					{
						name: 'Publish',
						value: 'publish',
						description: 'Publish a message to a topic',
						action: 'Publish a message to a topic',
					},
				],
				default: 'publish',
			},
			{
				displayName: 'Name',
				name: 'name',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Display Name',
						name: 'displayName',
						type: 'string',
						default: '',
						description: 'The display name to use for a topic with SMS subscriptions',
					},
					{
						displayName: 'Fifo Topic',
						name: 'fifoTopic',
						type: 'boolean',
						default: false,
						description:
							'Whether the topic you want to create is a FIFO (first-in-first-out) topic',
					},
				],
				displayOptions: {
					show: {
						operation: ['create'],
					},
				},
			},
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a topic...',
						typeOptions: {
							searchListMethod: 'listTopics',
							searchable: true,
						},
					},
					{
						displayName: 'By URL',
						name: 'url',
						type: 'string',
						placeholder:
							'https://us-east-1.console.aws.amazon.com/sns/v3/home?region=us-east-1#/topic/arn:aws:sns:us-east-1:777777777777:your_topic',
						validation: [
							{
								type: 'regex',
								properties: {
									regex:
										'https:\\/\\/[0-9a-zA-Z\\-_]+\\.console\\.aws\\.amazon\\.com\\/sns\\/v3\\/home\\?region\\=[0-9a-zA-Z\\-_]+\\#\\/topic\\/arn:aws:sns:[0-9a-zA-Z\\-_]+:[0-9]+:[0-9a-zA-Z\\-_]+(?:\\/.*|)',
									errorMessage: 'Not a valid AWS SNS Topic URL',
								},
							},
						],
						extractValue: {
							type: 'regex',
							regex:
								'https:\\/\\/[0-9a-zA-Z\\-_]+\\.console\\.aws\\.amazon\\.com\\/sns\\/v3\\/home\\?region\\=[0-9a-zA-Z\\-_]+\\#\\/topic\\/(arn:aws:sns:[0-9a-zA-Z\\-_]+:[0-9]+:[0-9a-zA-Z\\-_]+)(?:\\/.*|)',
						},
					},
					{
						displayName: 'ID',
						name: 'id',
						type: 'string',
						validation: [
							{
								type: 'regex',
								properties: {
									regex: 'arn:aws:sns:[0-9a-zA-Z\\-_]+:[0-9]+:[0-9a-zA-Z\\-_]+',
									errorMessage: 'Not a valid AWS SNS Topic ARN',
								},
							},
						],
						placeholder: 'arn:aws:sns:your-aws-region:777777777777:your_topic',
					},
				],
				displayOptions: {
					show: {
						operation: ['publish', 'delete'],
					},
				},
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['publish'],
					},
				},
				default: '',
				required: true,
				description: 'Subject when the message is delivered to email endpoints',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['publish'],
					},
				},
				required: true,
				default: '',
				description: 'The message you want to send',
			},
		],
	};

	methods = {
		listSearch: {
			async listTopics(
				this: ILoadOptionsFunctions,
				filter?: string,
				paginationToken?: string,
			): Promise<INodeListSearchResult> {
				const returnData: INodeListSearchItems[] = [];
				const params = paginationToken ? `NextToken=${encodeURIComponent(paginationToken)}` : '';

				const data = await awsApiRequestSOAP.call(
					this,
					'sns',
					'GET',
					'/?Action=ListTopics&' + params,
				);

				let topics = data.ListTopicsResponse.ListTopicsResult.Topics.member;
				const nextToken = data.ListTopicsResponse.ListTopicsResult.NextToken;

				if (nextToken) {
					paginationToken = nextToken as string;
				} else {
					paginationToken = undefined;
				}

				if (!Array.isArray(topics)) {
					topics = [topics];
				}

				for (const topic of topics) {
					const topicArn = topic.TopicArn as string;
					const arnParsed = topicArn.split(':');
					const topicName = arnParsed[5];
					const awsRegion = arnParsed[3];

					if (filter && !topicName.includes(filter)) {
						continue;
					}

					returnData.push({
						name: topicName,
						value: topicArn,
						url: `https://${awsRegion}.console.aws.amazon.com/sns/v3/home?region=${awsRegion}#/topic/${topicArn}`,
					});
				}
				return { results: returnData, paginationToken };
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				if (operation === 'create') {
					let name = this.getNodeParameter('name', i) as string;
					const fifoTopic = this.getNodeParameter('options.fifoTopic', i, false) as boolean;
					const displayName = this.getNodeParameter('options.displayName', i, '') as string;
					const params: string[] = [];

					if (fifoTopic && !name.endsWith('.fifo')) {
						name = `${name}.fifo`;
					}

					params.push(`Name=${name}`);

					if (fifoTopic) {
						params.push('Attributes.entry.1.key=FifoTopic');
						params.push('Attributes.entry.1.value=true');
					}

					if (displayName) {
						params.push('Attributes.entry.2.key=DisplayName');
						params.push(`Attributes.entry.2.value=${displayName}`);
					}

					const responseData = await awsApiRequestSOAP.call(
						this,
						'sns',
						'GET',
						'/?Action=CreateTopic&' + params.join('&'),
					);
					returnData.push({
						TopicArn: responseData.CreateTopicResponse.CreateTopicResult.TopicArn,
					} as IDataObject);
				}
				if (operation === 'delete') {
					const topic = this.getNodeParameter('topic', i, undefined, {
						extractValue: true,
					}) as string;
					const params = ['TopicArn=' + topic];

					await awsApiRequestSOAP.call(
						this,
						'sns',
						'GET',
						'/?Action=DeleteTopic&' + params.join('&'),
					);
					// response of delete is the same no matter if topic was deleted or not
					returnData.push({ success: true } as IDataObject);
				}
				if (operation === 'publish') {
					const topic = this.getNodeParameter('topic', i, undefined, {
						extractValue: true,
					}) as string;

					const params = [
						'TopicArn=' + topic,
						'Subject=' + (this.getNodeParameter('subject', i) as string),
						'Message=' + (this.getNodeParameter('message', i) as string),
					];

					const responseData = await awsApiRequestSOAP.call(
						this,
						'sns',
						'GET',
						'/?Action=Publish&' + params.join('&'),
					);
					returnData.push({
						MessageId: responseData.PublishResponse.PublishResult.MessageId,
					} as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
