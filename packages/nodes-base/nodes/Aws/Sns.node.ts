import {
	SNS,
	config,
	AWSError,
} from 'aws-sdk';
import { IExecuteFunctions } from 'n8n-core';
import {
	INodeTypeDescription,
	INodeExecutionData,
	INodeType,
	INodePropertyOptions,
	ILoadOptionsFunctions,
	IDataObject
} from 'n8n-workflow';

export class Sns implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Amazon SNS',
		name: 'amazonSns',
		icon: 'file:sns.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["topic"]}}',
		description: 'Sends data to Amazon SNS',
		defaults: {
			name: 'Amazon SNS',
			color: '#BB2244',
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
				const credentials = this.getCredentials('aws');

				if (credentials === undefined) {
					throw new Error('No credentials got returned!');
				}

				config.update({
					region: `${credentials.region}`,
					accessKeyId: `${credentials.accessKeyId}`,
					secretAccessKey: `${credentials.secretAccessKey}`,
				});

				const returnData: INodePropertyOptions[] = [];

				let sns = new SNS();
				try {
					var data = await sns.listTopics({}).promise();
				} catch (err) {
					throw new Error(`AWS Error: ${err}`);
				}

				for (let topic of data.Topics!) {
					let topicArn = topic.TopicArn!;
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

		const credentials = this.getCredentials('aws');
		if (credentials === undefined) {
			throw new Error('No credentials got returned!');
		}

		let topicArn: string;
		let subject: string;
		let message: string;

		config.update({
			region: `${credentials.region}`,
			accessKeyId: `${credentials.accessKeyId}`,
			secretAccessKey: `${credentials.secretAccessKey}`,
		});
		let sns = new SNS();

		for (let i = 0; i < items.length; i++) {
			topicArn = this.getNodeParameter('topic', i) as string;
			subject = this.getNodeParameter('subject', i) as string;
			message = this.getNodeParameter('message', i) as string;

			let params = {
				Message: message,
				Subject: subject,
				TopicArn: topicArn,
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
