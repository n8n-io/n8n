import type {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
} from 'n8n-workflow';

import { convertKitApiRequest } from './GenericFunctions';

import { snakeCase } from 'change-case';

export class ConvertKitTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ConvertKit Trigger',
		name: 'convertKitTrigger',
		icon: 'file:convertKit.svg',
		subtitle: '={{$parameter["event"]}}',
		group: ['trigger'],
		version: 1,
		description: 'Handle ConvertKit events via webhooks',
		defaults: {
			name: 'ConvertKit Trigger',
		},
		inputs: [],
		outputs: ['main'],
		credentials: [
			{
				name: 'convertKitApi',
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
				displayName: 'Event',
				name: 'event',
				type: 'options',
				required: true,
				default: '',
				description: 'The events that can trigger the webhook and whether they are enabled',
				options: [
					{
						name: 'Form Subscribe',
						value: 'formSubscribe',
					},
					{
						name: 'Link Click',
						value: 'linkClick',
					},
					{
						name: 'Product Purchase',
						value: 'productPurchase',
					},
					{
						name: 'Purchase Created',
						value: 'purchaseCreate',
					},
					{
						name: 'Sequence Complete',
						value: 'courseComplete',
					},
					{
						name: 'Sequence Subscribe',
						value: 'courseSubscribe',
					},
					{
						name: 'Subscriber Activated',
						value: 'subscriberActivate',
					},
					{
						name: 'Subscriber Unsubscribe',
						value: 'subscriberUnsubscribe',
					},
					{
						name: 'Tag Add',
						value: 'tagAdd',
					},
					{
						name: 'Tag Remove',
						value: 'tagRemove',
					},
				],
			},
			{
				displayName: 'Form Name or ID',
				name: 'formId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getForms',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						event: ['formSubscribe'],
					},
				},
			},
			{
				displayName: 'Sequence Name or ID',
				name: 'courseId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getSequences',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						event: ['courseSubscribe', 'courseComplete'],
					},
				},
			},
			{
				displayName: 'Initiating Link',
				name: 'link',
				type: 'string',
				required: true,
				default: '',
				description: 'The URL of the initiating link',
				displayOptions: {
					show: {
						event: ['linkClick'],
					},
				},
			},
			{
				displayName: 'Product ID',
				name: 'productId',
				type: 'string',
				required: true,
				default: '',
				displayOptions: {
					show: {
						event: ['productPurchase'],
					},
				},
			},
			{
				displayName: 'Tag Name or ID',
				name: 'tagId',
				type: 'options',
				description:
					'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code-examples/expressions/">expression</a>',
				typeOptions: {
					loadOptionsMethod: 'getTags',
				},
				required: true,
				default: '',
				displayOptions: {
					show: {
						event: ['tagAdd', 'tagRemove'],
					},
				},
			},
		],
	};

	methods = {
		loadOptions: {
			// Get all the tags to display them to user so that he can
			// select them easily
			async getTags(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const { tags } = await convertKitApiRequest.call(this, 'GET', '/tags');

				for (const tag of tags) {
					const tagName = tag.name;

					const tagId = tag.id;

					returnData.push({
						name: tagName,
						value: tagId,
					});
				}

				return returnData;
			},
			// Get all the forms to display them to user so that he can
			// select them easily
			async getForms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const { forms } = await convertKitApiRequest.call(this, 'GET', '/forms');

				for (const form of forms) {
					const formName = form.name;

					const formId = form.id;

					returnData.push({
						name: formName,
						value: formId,
					});
				}

				return returnData;
			},

			// Get all the sequences to display them to user so that he can
			// select them easily
			async getSequences(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const { courses } = await convertKitApiRequest.call(this, 'GET', '/sequences');

				for (const course of courses) {
					const courseName = course.name;

					const courseId = course.id;

					returnData.push({
						name: courseName,
						value: courseId,
					});
				}

				return returnData;
			},
		},
	};

	// @ts-ignore (because of request)
	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				// THe API does not have an endpoint to list all webhooks

				if (webhookData.webhookId) {
					return true;
				}

				return false;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');

				let event = this.getNodeParameter('event', 0) as string;

				const endpoint = '/automations/hooks';

				if (event === 'purchaseCreate') {
					event = `purchase.${snakeCase(event)}`;
				} else {
					event = `subscriber.${snakeCase(event)}`;
				}

				const body: IDataObject = {
					target_url: webhookUrl as string,
					event: {
						name: event,
					},
				};

				if (event === 'subscriber.form_subscribe') {
					//@ts-ignore
					body.event.form_id = this.getNodeParameter('formId', 0);
				}

				if (event === 'subscriber.course_subscribe' || event === 'subscriber.course_complete') {
					//@ts-ignore
					body.event.sequence_id = this.getNodeParameter('courseId', 0);
				}

				if (event === 'subscriber.link_click') {
					//@ts-ignore
					body.event.initiator_value = this.getNodeParameter('link', 0);
				}

				if (event === 'subscriber.product_purchase') {
					//@ts-ignore
					body.event.product_id = this.getNodeParameter('productId', 0);
				}

				if (event === 'subscriber.tag_add' || event === 'subscriber.tag_remove') {
					//@ts-ignore
					body.event.tag_id = this.getNodeParameter('tagId', 0);
				}

				const webhook = await convertKitApiRequest.call(this, 'POST', endpoint, body);

				if (webhook.rule.id === undefined) {
					return false;
				}

				const webhookData = this.getWorkflowStaticData('node');

				webhookData.webhookId = webhook.rule.id as string;

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');

				if (webhookData.webhookId !== undefined) {
					const endpoint = `/automations/hooks/${webhookData.webhookId}`;

					try {
						await convertKitApiRequest.call(this, 'DELETE', endpoint);
					} catch (error) {
						return false;
					}

					delete webhookData.webhookId;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const returnData: IDataObject[] = [];
		returnData.push(this.getBodyData());

		return {
			workflowData: [this.helpers.returnJsonArray(returnData)],
		};
	}
}
