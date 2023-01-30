import type { IExecuteFunctions, ILoadOptionsFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { convertKitApiRequest } from './GenericFunctions';

import { customFieldFields, customFieldOperations } from './CustomFieldDescription';

import { formFields, formOperations } from './FormDescription';

import { sequenceFields, sequenceOperations } from './SequenceDescription';

import { tagFields, tagOperations } from './TagDescription';

import { tagSubscriberFields, tagSubscriberOperations } from './TagSubscriberDescription';

export class ConvertKit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ConvertKit',
		name: 'convertKit',
		icon: 'file:convertKit.svg',
		group: ['input'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume ConvertKit API',
		defaults: {
			name: 'ConvertKit',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'convertKitApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Custom Field',
						value: 'customField',
					},
					{
						name: 'Form',
						value: 'form',
					},
					{
						name: 'Sequence',
						value: 'sequence',
					},
					{
						name: 'Tag',
						value: 'tag',
					},
					{
						name: 'Tag Subscriber',
						value: 'tagSubscriber',
					},
				],
				default: 'form',
			},
			//--------------------
			// Field Description
			//--------------------
			...customFieldOperations,
			...customFieldFields,
			//--------------------
			// FormDescription
			//--------------------
			...formOperations,
			...formFields,
			//--------------------
			// Sequence Description
			//--------------------
			...sequenceOperations,
			...sequenceFields,
			//--------------------
			// Tag Description
			//--------------------
			...tagOperations,
			...tagFields,
			//--------------------
			// Tag Subscriber Description
			//--------------------
			...tagSubscriberOperations,
			...tagSubscriberFields,
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

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const qs: IDataObject = {};
		let responseData;

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'customField') {
					if (operation === 'create') {
						const label = this.getNodeParameter('label', i) as string;

						responseData = await convertKitApiRequest.call(
							this,
							'POST',
							'/custom_fields',
							{ label },
							qs,
						);
					}
					if (operation === 'delete') {
						const id = this.getNodeParameter('id', i) as string;

						responseData = await convertKitApiRequest.call(this, 'DELETE', `/custom_fields/${id}`);
					}
					if (operation === 'get') {
						const id = this.getNodeParameter('id', i) as string;

						responseData = await convertKitApiRequest.call(this, 'GET', `/custom_fields/${id}`);
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						responseData = await convertKitApiRequest.call(this, 'GET', '/custom_fields');

						responseData = responseData.custom_fields;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);

							responseData = responseData.slice(0, limit);
						}
					}
					if (operation === 'update') {
						const id = this.getNodeParameter('id', i) as string;

						const label = this.getNodeParameter('label', i) as string;

						responseData = await convertKitApiRequest.call(this, 'PUT', `/custom_fields/${id}`, {
							label,
						});

						responseData = { success: true };
					}
				}

				if (resource === 'form') {
					if (operation === 'addSubscriber') {
						const email = this.getNodeParameter('email', i) as string;

						const formId = this.getNodeParameter('id', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							email,
						};

						if (additionalFields.firstName) {
							body.first_name = additionalFields.firstName as string;
						}

						if (additionalFields.tags) {
							body.tags = additionalFields.tags as string[];
						}

						if (additionalFields.fieldsUi) {
							const fieldValues = (additionalFields.fieldsUi as IDataObject)
								.fieldsValues as IDataObject[];
							if (fieldValues) {
								body.fields = {};
								for (const fieldValue of fieldValues) {
									//@ts-ignore
									body.fields[fieldValue.key] = fieldValue.value;
								}
							}
						}

						const { subscription } = await convertKitApiRequest.call(
							this,
							'POST',
							`/forms/${formId}/subscribe`,
							body,
						);

						responseData = subscription;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						responseData = await convertKitApiRequest.call(this, 'GET', '/forms');

						responseData = responseData.forms;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);

							responseData = responseData.slice(0, limit);
						}
					}
					if (operation === 'getSubscriptions') {
						const formId = this.getNodeParameter('id', i) as string;

						const returnAll = this.getNodeParameter('returnAll', i);

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.subscriberState) {
							qs.subscriber_state = additionalFields.subscriberState as string;
						}

						responseData = await convertKitApiRequest.call(
							this,
							'GET',
							`/forms/${formId}/subscriptions`,
							{},
							qs,
						);

						responseData = responseData.subscriptions;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);

							responseData = responseData.slice(0, limit);
						}
					}
				}

				if (resource === 'sequence') {
					if (operation === 'addSubscriber') {
						const email = this.getNodeParameter('email', i) as string;

						const sequenceId = this.getNodeParameter('id', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							email,
						};

						if (additionalFields.firstName) {
							body.first_name = additionalFields.firstName as string;
						}

						if (additionalFields.tags) {
							body.tags = additionalFields.tags as string[];
						}

						if (additionalFields.fieldsUi) {
							const fieldValues = (additionalFields.fieldsUi as IDataObject)
								.fieldsValues as IDataObject[];
							if (fieldValues) {
								body.fields = {};
								for (const fieldValue of fieldValues) {
									//@ts-ignore
									body.fields[fieldValue.key] = fieldValue.value;
								}
							}
						}

						const { subscription } = await convertKitApiRequest.call(
							this,
							'POST',
							`/sequences/${sequenceId}/subscribe`,
							body,
						);

						responseData = subscription;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						responseData = await convertKitApiRequest.call(this, 'GET', '/sequences');

						responseData = responseData.courses;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);

							responseData = responseData.slice(0, limit);
						}
					}
					if (operation === 'getSubscriptions') {
						const sequenceId = this.getNodeParameter('id', i) as string;

						const returnAll = this.getNodeParameter('returnAll', i);

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (additionalFields.subscriberState) {
							qs.subscriber_state = additionalFields.subscriberState as string;
						}

						responseData = await convertKitApiRequest.call(
							this,
							'GET',
							`/sequences/${sequenceId}/subscriptions`,
							{},
							qs,
						);

						responseData = responseData.subscriptions;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);

							responseData = responseData.slice(0, limit);
						}
					}
				}

				if (resource === 'tag') {
					if (operation === 'create') {
						const names = (this.getNodeParameter('name', i) as string)
							.split(',')
							.map((e) => ({ name: e }));

						const body: IDataObject = {
							tag: names,
						};

						responseData = await convertKitApiRequest.call(this, 'POST', '/tags', body);
					}

					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', i);

						responseData = await convertKitApiRequest.call(this, 'GET', '/tags');

						responseData = responseData.tags;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);

							responseData = responseData.slice(0, limit);
						}
					}
				}

				if (resource === 'tagSubscriber') {
					if (operation === 'add') {
						const tagId = this.getNodeParameter('tagId', i) as string;

						const email = this.getNodeParameter('email', i) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						const body: IDataObject = {
							email,
						};

						if (additionalFields.firstName) {
							body.first_name = additionalFields.firstName as string;
						}

						if (additionalFields.fieldsUi) {
							const fieldValues = (additionalFields.fieldsUi as IDataObject)
								.fieldsValues as IDataObject[];
							if (fieldValues) {
								body.fields = {};
								for (const fieldValue of fieldValues) {
									//@ts-ignore
									body.fields[fieldValue.key] = fieldValue.value;
								}
							}
						}

						const { subscription } = await convertKitApiRequest.call(
							this,
							'POST',
							`/tags/${tagId}/subscribe`,
							body,
						);

						responseData = subscription;
					}

					if (operation === 'getAll') {
						const tagId = this.getNodeParameter('tagId', i) as string;

						const returnAll = this.getNodeParameter('returnAll', i);

						responseData = await convertKitApiRequest.call(
							this,
							'GET',
							`/tags/${tagId}/subscriptions`,
						);

						responseData = responseData.subscriptions;

						if (!returnAll) {
							const limit = this.getNodeParameter('limit', i);

							responseData = responseData.slice(0, limit);
						}
					}

					if (operation === 'delete') {
						const tagId = this.getNodeParameter('tagId', i) as string;

						const email = this.getNodeParameter('email', i) as string;

						responseData = await convertKitApiRequest.call(
							this,
							'POST',
							`/tags/${tagId}>/unsubscribe`,
							{ email },
						);
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);
				returnData.push(...executionData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message, json: {} });
					continue;
				}
				throw error;
			}
		}

		return this.prepareOutputData(returnData);
	}
}
