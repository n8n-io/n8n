import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import {
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import { awsApiRequestSOAP } from './GenericFunctions';

import { get } from 'lodash';

export class AwsSnsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AWS SNS Trigger',
		subtitle: `={{$parameter["topic"].split(':')[5]}}`,
		name: 'awsSnsTrigger',
		icon: 'file:sns.svg',
		group: ['trigger'],
		version: 1,
		description: 'Handle AWS SNS events via webhooks',
		defaults: {
			name: 'AWS-SNS-Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'aws',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'webhook',
			},
		],
		properties: [
			{
				displayName: 'Topic Name or ID',
				name: 'topic',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				required: true,
				typeOptions: {
					loadOptionsMethod: 'getTopics',
				},
				default: '',
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
	// @ts-ignore
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const topic = this.getNodeParameter('topic') as string;
				if (webhookData.webhookId === undefined) {
					return false;
				}
				const params = [`TopicArn=${topic}`, 'Version=2010-03-31'];
				const data = await awsApiRequestSOAP.call(
					this,
					'sns',
					'GET',
					'/?Action=ListSubscriptionsByTopic&' + params.join('&'),
				);
				const subscriptions = get(
					data,
					'ListSubscriptionsByTopicResponse.ListSubscriptionsByTopicResult.Subscriptions',
				);
				if (!subscriptions || !subscriptions.member) {
					return false;
				}

				let subscriptionMembers = subscriptions.member;

				if (!Array.isArray(subscriptionMembers)) {
					subscriptionMembers = [subscriptionMembers];
				}

				for (const subscription of subscriptionMembers) {
					if (webhookData.webhookId === subscription.SubscriptionArn) {
						return true;
					}
				}
				return false;
			},
			async create(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const webhookUrl = this.getNodeWebhookUrl('default') as string;
				const topic = this.getNodeParameter('topic') as string;

				if (webhookUrl.includes('%20')) {
					throw new NodeOperationError(
						this.getNode(),
						'The name of the SNS Trigger Node is not allowed to contain any spaces!',
					);
				}

				const params = [
					`TopicArn=${topic}`,
					`Endpoint=${webhookUrl}`,
					`Protocol=${webhookUrl?.split(':')[0]}`,
					'ReturnSubscriptionArn=true',
					'Version=2010-03-31',
				];

				const { SubscribeResponse } = await awsApiRequestSOAP.call(
					this,
					'sns',
					'GET',
					'/?Action=Subscribe&' + params.join('&'),
				);
				webhookData.webhookId = SubscribeResponse.SubscribeResult.SubscriptionArn;

				return true;
			},
			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const params = [`SubscriptionArn=${webhookData.webhookId}`, 'Version=2010-03-31'];
				try {
					await awsApiRequestSOAP.call(
						this,
						'sns',
						'GET',
						'/?Action=Unsubscribe&' + params.join('&'),
					);
				} catch (error) {
					return false;
				}
				delete webhookData.webhookId;
				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const req = this.getRequestObject();
		const topic = this.getNodeParameter('topic') as string;

		// @ts-ignore
		const body = JSON.parse(req.rawBody.toString());

		if (body.Type === 'SubscriptionConfirmation' && body.TopicArn === topic) {
			const { Token } = body;
			const params = [`TopicArn=${topic}`, `Token=${Token}`, 'Version=2010-03-31'];
			await awsApiRequestSOAP.call(
				this,
				'sns',
				'GET',
				'/?Action=ConfirmSubscription&' + params.join('&'),
			);

			return {
				noWebhookResponse: true,
			};
		}

		if (body.Type === 'UnsubscribeConfirmation') {
			return {};
		}

		//TODO verify message signature
		return {
			workflowData: [this.helpers.returnJsonArray(body)],
		};
	}
}
