import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
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
				displayName: 'Topic Name or ID',
				name: 'topic',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTopics',
				},
				displayOptions: {
					show: {
						operation: ['publish'],
					},
				},
				options: [],
				default: '',
				required: true,
				description:
					'The topic you want to publish to. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>.',
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
			// Get all the available topics to display them to user so that he can
			// select them easily
			async getTopics(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const data = await awsApiRequestSOAP.call(this, 'sns', 'GET', '/?Action=ListTopics');

				let topics = data.ListTopicsResponse.ListTopicsResult.Topics.member;

				if (!Array.isArray(topics)) {
					// If user has only a single topic no array get returned so we make
					// one manually to be able to process everything identically
					topics = [topics];
				}

				for (const topic of topics) {
					const topicArn = topic.TopicArn as string;
					const topicName = topicArn.split(':')[5];

					returnData.push({
						name: topicName,
						value: topicArn,
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
			try {
				if (operation === 'create') {
					let name = this.getNodeParameter('name', i) as string;
					const fifoTopic = this.getNodeParameter('options.fifoTopic', i, false) as boolean;
					const displayName = this.getNodeParameter('options.displayName', i, '') as string;
					const params: string[] = [];

					if (fifoTopic) {
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
				if (operation === 'publish') {
					const params = [
						('TopicArn=' + this.getNodeParameter('topic', i)) as string,
						('Subject=' + this.getNodeParameter('subject', i)) as string,
						('Message=' + this.getNodeParameter('message', i)) as string,
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
