import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ILoadOptionsFunctions,
	INodeTypeDescription,
	INodeType,
	INodeExecutionData,
	IDataObject,
	INodePropertyOptions,
} from 'n8n-workflow';

import {
	documentOperations,
	documentFields
} from './DocumentDescription';

import {
	erpNextApiRequest,
	erpNextApiRequestAllItems
} from './GenericFunctions';

export class ERPNext implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ERPNext',
		name: 'erpNext',
		icon: 'file:erpnext.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume ERPNext API',
		defaults: {
			name: 'ERPNext',
			color: '#7574ff',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'erpNextApi',
				required: true,
			},
			// {
			// 	name: 'erpNextOAuth2Api',
			// 	required: true,
			// 	displayOptions: {
			// 		show: {
			// 			authentication: [
			// 				'oAuth2',
			// 			],
			// 		},
			// 	},
			// },
		],
		properties: [
			// {
			// 	displayName: 'Authentication',
			// 	name: 'authentication',
			// 	type: 'options',
			// 	options: [
			// 		{
			// 			name: 'Access Token',
			// 			value: 'accessToken',
			// 		},
			// 		{
			// 			name: 'OAuth2',
			// 			value: 'oAuth2',
			// 		},
			// 	],
			// 	default: 'accessToken',
			// 	description: 'The resource to operate on.',
			// },
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Document',
						value: 'document',
					},
				],
				default: 'document',
				description: 'Resource to consume.',
			},

			// DOCUMENT
			...documentOperations,
			...documentFields
		],
	};

	methods = {
		loadOptions: {
			// Get all the doc types to display them to user so that he can
			// select them easily
			async getDocTypes(
				this: ILoadOptionsFunctions
			): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const types = await erpNextApiRequestAllItems.call(
					this,
					'data',
					'GET',
					'/api/resource/DocType',
					{},
				);

				for (const type of types) {
					const typeName = type.name;
					const typeId = type.name;
					returnData.push({
						name: typeName,
						value: encodeURI(typeId)
					});
				}
				return returnData;
			},

			// Get all the doc fields to display them to user so that he can
			// select them easily
			async getDocFields(
				this: ILoadOptionsFunctions
			): Promise<INodePropertyOptions[]> {
				const docId = this.getCurrentNodeParameter('docType') as string;
				const returnData: INodePropertyOptions[] = [];
				const { data } = await erpNextApiRequest.call(
					this,
					'GET',
					`/api/resource/DocType/${docId}`,
					{},
				);
				for (const field of data.fields) {
					//field.reqd wheater is required or not
					const fieldName = field.label;
					const fieldId = field.fieldname;
					returnData.push({
						name: fieldName,
						value: fieldId
					});
				}
				return returnData;
			},
		}
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length as unknown as number;
		let responseData;
		const body: IDataObject = {};
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			//https://app.swaggerhub.com/apis-docs/alyf.de/ERPNext/11#/Resources/post_api_resource_Webhook
			//https://frappeframework.com/docs/user/en/guides/integration/rest_api/manipulating_documents
			if (resource === 'document') {
				if (operation === 'get') {
					const docType = this.getNodeParameter('docType', i) as string;
					const documentName = this.getNodeParameter('documentName', i) as string;

					const endpoint = `/api/resource/${docType}/${documentName}`;

					responseData = await erpNextApiRequest.call(this, 'GET', endpoint, {});

					responseData = responseData.data;
				}
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const docType = this.getNodeParameter('docType', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const endpoint = `/api/resource/${docType}`;

					// Add field options for query. FORMAT: fields=["test", "example", "hi"]
					if (additionalFields.fields) {
						qs.fields = JSON.stringify(additionalFields.fields as string[]);
					}

					// Add filter options for query. FORMAT: filters=[["Person","first_name","=","Jane"]]
					if (additionalFields.filters) {

						const operators: { [key: string]: string } = {
							'is': '=',
							'isNot': '!=',
							'greater': '>',
							'less': '<',
							'equalsGreater': '>=',
							'equalsLess': '<=',
						};

						const filterValues = (additionalFields.filters as IDataObject).customProperty as IDataObject[];
						const filters: string[][] = [];
						for (const filter of filterValues) {
							const data = [
								docType,
								filter.field as string,
								operators[filter.operator as string],
								filter.value as string,
							];
							filters.push(data);
						}
						qs.filters = filters;
					}

					if (!returnAll) {

						const limit = this.getNodeParameter('limit', i) as number;
						qs.limit_page_lengt = limit;
						qs.limit_start = 1;
						responseData = await erpNextApiRequest.call(this, 'GET', endpoint, {}, qs);
						responseData = responseData.data;

					} else {
						responseData = await erpNextApiRequestAllItems.call(this, 'data', 'GET', endpoint, {}, qs);
					}
				}
				if (operation === 'create') {
					const docType = this.getNodeParameter('docType', i) as string;
					const endpoint = `/api/resource/${docType}`;

					const properties = this.getNodeParameter('properties', i) as IDataObject;

					if (properties) {
						const fieldsValues = (properties as IDataObject).customProperty as IDataObject[];
						if (Array.isArray(fieldsValues) && fieldsValues.length === 0) {
							throw new Error(
								`At least one property has to be defined`,
							);
						}
						for (const fieldValue of fieldsValues) {
							body[fieldValue.field as string] = fieldValue.value;
						}
					}

					responseData = await erpNextApiRequest.call(this, 'POST', endpoint, body);
					responseData = responseData.data;
				}
				if (operation === 'delete') {
					const docType = this.getNodeParameter('docType', i) as string;
					const documentName = this.getNodeParameter('documentName', i) as string;

					const endpoint = `/api/resource/${docType}/${documentName}`;

					responseData = await erpNextApiRequest.call(this, 'DELETE', endpoint, {});
				}
				if (operation === 'update') {
					const docType = this.getNodeParameter('docType', i) as string;
					const documentName = this.getNodeParameter('documentName', i) as string;
					const endpoint = `/api/resource/${docType}/${documentName}`;

					const properties = this.getNodeParameter('properties', i) as IDataObject;

					if (properties) {
						const fieldsValues = (properties as IDataObject).customProperty as IDataObject[];
						for (const fieldValue of fieldsValues) {
							body[fieldValue.field as string] = fieldValue.value;
						}
					}

					responseData = await erpNextApiRequest.call(this, 'PUT', endpoint, body);
					responseData = responseData.data;
				}
			}

			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as unknown as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
