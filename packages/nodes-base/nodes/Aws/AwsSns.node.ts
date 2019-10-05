import { IExecuteFunctions } from 'n8n-core';
import {
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	INodePropertyOptions,
	ILoadOptionsFunctions,
	IDataObject
} from 'n8n-workflow';

import { awsConfigCredentials } from './GenericFunctions';

import { SNS } from 'aws-sdk';

export class AwsSns implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS SNS',
		name: 'awsSns',
		icon: 'file:sns.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["topic"]}}',
		description: 'Sends data to AWS SNS',
		defaults: {
			name: 'AWS SNS',
			color: '#FF9900',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			}
		],
		properties: [
			{
				displayName: 'Topic',
				name: 'topic',
				type: 'options',
				typeOptions: {
					loadOptionsMethod: 'getTopics',
				},
				options: [],
				default: '',
				required: true,
				description: 'The topic you want to publish to',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				description: 'Subject when the message is delivered to email endpoints',
			},
			{
				displayName: 'Message',
				name: 'message',
				type: 'string',
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
				await awsConfigCredentials.call(this);

				const returnData: INodePropertyOptions[] = [];

				let sns = new SNS();
				try {
					var data = await sns.listTopics({}).promise();
				} catch (err) {
					throw new Error(`AWS Error: ${err}`);
				}

				for (let topic of data.Topics!) {
					let topicArn = topic.TopicArn as string;
					let topicName = topicArn.split(':')[5];

					returnData.push({
						name: topicName,
						value: topicArn,
					});
				}
				return returnData;
			}
		},
	};


	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		await awsConfigCredentials.call(this);
		const sns = new SNS();

		for (let i = 0; i < items.length; i++) {
			const params = {
				TopicArn: this.getNodeParameter('topic', i) as string,
				Subject: this.getNodeParameter('subject', i) as string,
				Message: this.getNodeParameter('message', i) as string,
			};

			try {
				var responseData = await sns.publish(params).promise();
			} catch (err) {
				throw new Error(`AWS Error: ${err}`);
			}
			returnData.push(responseData as IDataObject);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
