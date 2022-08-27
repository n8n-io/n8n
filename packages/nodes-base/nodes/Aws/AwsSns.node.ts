import { IExecuteFunctions } from 'n8n-core';
import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
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
						name: 'Publish',
						value: 'publish',
						description: 'Publish a message to a topic',
						action: 'Publish a message to a topic',
					},
				],
				default: 'publish',
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

		for (let i = 0; i < items.length; i++) {
			try {
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
