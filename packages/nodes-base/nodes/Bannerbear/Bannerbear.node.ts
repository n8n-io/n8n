import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { bannerbearApiRequest, keysToSnakeCase } from './GenericFunctions';

import { imageFields, imageOperations } from './ImageDescription';

import { templateFields, templateOperations } from './TemplateDescription';

export class Bannerbear implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Bannerbear',
		name: 'bannerbear',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:bannerbear.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Bannerbear API',
		defaults: {
			name: 'Bannerbear',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'bannerbearApi',
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
						name: 'Image',
						value: 'image',
					},
					{
						name: 'Template',
						value: 'template',
					},
				],
				default: 'image',
			},
			// IMAGE
			...imageOperations,
			...imageFields,
			// TEMPLATE
			...templateOperations,
			...templateFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available templates to display them to user so that he can
			// select them easily
			async getTemplates(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const templates = await bannerbearApiRequest.call(this, 'GET', '/templates');
				for (const template of templates) {
					const templateName = template.name;
					const templateId = template.uid;
					returnData.push({
						name: templateName,
						value: templateId,
					});
				}
				return returnData;
			},

			// Get all the available modifications to display them to user so that he can
			// select them easily
			async getModificationNames(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const templateId = this.getCurrentNodeParameter('templateId');
				const returnData: INodePropertyOptions[] = [];
				const { available_modifications } = await bannerbearApiRequest.call(
					this,
					'GET',
					`/templates/${templateId}`,
				);
				for (const modification of available_modifications) {
					const modificationName = modification.name;
					const modificationId = modification.name;
					returnData.push({
						name: modificationName,
						value: modificationId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		for (let i = 0; i < length; i++) {
			if (resource === 'image') {
				//https://developers.bannerbear.com/#create-an-image
				if (operation === 'create') {
					const templateId = this.getNodeParameter('templateId', i) as string;
					const additionalFields = this.getNodeParameter('additionalFields', i);
					const modifications = (this.getNodeParameter('modificationsUi', i) as IDataObject)
						.modificationsValues as IDataObject;
					const body: IDataObject = {
						template: templateId,
					};
					if (additionalFields.webhookUrl) {
						body.webhook_url = additionalFields.webhookUrl as string;
					}
					if (additionalFields.metadata) {
						body.metadata = additionalFields.metadata as string;
					}
					if (modifications) {
						body.modifications = keysToSnakeCase(modifications);
						// delete all fields set to empty
						for (const modification of body.modifications as IDataObject[]) {
							for (const key of Object.keys(modification)) {
								if (modification[key] === '') {
									delete modification[key];
								}
							}
						}
					}
					responseData = await bannerbearApiRequest.call(this, 'POST', '/images', body);
					if (additionalFields.waitForImage && responseData.status !== 'completed') {
						let maxTries = (additionalFields.waitForImageMaxTries as number) || 3;

						const promise = async (uid: string) => {
							let data: IDataObject = {};
							return new Promise((resolve, reject) => {
								const timeout = setInterval(async () => {
									data = await bannerbearApiRequest.call(this, 'GET', `/images/${uid}`);

									if (data.status === 'completed') {
										clearInterval(timeout);
										resolve(data);
									}
									if (--maxTries === 0) {
										clearInterval(timeout);
										reject(new Error('Image did not finish processing after multiple tries.'));
									}
								}, 2000);
							});
						};

						responseData = await promise(responseData.uid);
					}
				}
				//https://developers.bannerbear.com/#get-a-specific-image
				if (operation === 'get') {
					const imageId = this.getNodeParameter('imageId', i) as string;
					responseData = await bannerbearApiRequest.call(this, 'GET', `/images/${imageId}`);
				}
			}
			if (resource === 'template') {
				//https://developers.bannerbear.com/#get-a-specific-template
				if (operation === 'get') {
					const templateId = this.getNodeParameter('templateId', i) as string;
					responseData = await bannerbearApiRequest.call(this, 'GET', `/templates/${templateId}`);
				}
				//https://developers.bannerbear.com/#list-templates
				if (operation === 'getAll') {
					responseData = await bannerbearApiRequest.call(this, 'GET', '/templates');
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
