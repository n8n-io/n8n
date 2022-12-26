import { IHookFunctions, IWebhookFunctions } from 'n8n-core';

import {
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	jsonParse,
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
			name: 'AWS SNS Trigger',
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

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				const topic = this.getNodeParameter('topic', undefined, {
					extractValue: true,
				}) as string;

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
				if (!subscriptions?.member) {
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
				const topic = this.getNodeParameter('topic', undefined, {
					extractValue: true,
				}) as string;

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
		const topic = this.getNodeParameter('topic', undefined, {
			extractValue: true,
		}) as string;

		const body = jsonParse<{ Type: string; TopicArn: string; Token: string }>(
			req.rawBody.toString(),
		);

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
