/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { documentFields, documentOperations } from './DocumentDescription';
import { erpNextApiRequest, erpNextApiRequestAllItems } from './GenericFunctions';
import type { DocumentProperties } from './utils';
import { processNames, toSQL } from './utils';

export class ERPNext implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ERPNext',
		name: 'erpNext',
		icon: 'file:erpnext.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["resource"] + ": " + $parameter["operation"]}}',
		description: 'Consume ERPNext API',
		defaults: {
			name: 'ERPNext',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'erpNextApi',
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
						name: 'Document',
						value: 'document',
					},
				],
				default: 'document',
			},
			...documentOperations,
			...documentFields,
		],
	};

	methods = {
		loadOptions: {
			async getDocTypes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const data = await erpNextApiRequestAllItems.call(
					this,
					'data',
					'GET',
					'/api/resource/DocType',
					{},
				);
				const docTypes = data.map(({ name }: { name: string }) => {
					return { name, value: encodeURI(name) };
				});

				return processNames(docTypes);
			},
			async getDocFilters(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const docType = decodeURIComponent(this.getCurrentNodeParameter('docType') as string);
				const qs = {
					filters: JSON.stringify([['parent', '=', docType]]),
					fields: JSON.stringify(['fieldname', 'label']),
					limit_page_length: 1000,
				};
				const { data } = await erpNextApiRequest.call(this, 'GET', '/api/resource/DocField', {}, qs);

				const docFields = data.map(
					({ label, fieldname }: { label: string; fieldname: string }) => {
						return { name: label || fieldname, value: fieldname };
					},
				);

				docFields.unshift({ name: '*', value: '*' });

				return processNames(docFields);
			},
			async getDocFields(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const docType = decodeURIComponent(this.getCurrentNodeParameter('docType') as string);
				const qs = {
					filters: JSON.stringify([['parent', '=', docType]]),
					fields: JSON.stringify(['fieldname', 'label']),
					limit_page_length: 1000,
				};
				const { data } = await erpNextApiRequest.call(this, 'GET', '/api/resource/DocField', {}, qs);

				const docFields = data.map(
					({ label, fieldname }: { label: string; fieldname: string }) => {
						return { name: label || fieldname, value: fieldname };
					},
				);

				return processNames(docFields);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const returnData: INodeExecutionData[] = [];
		let responseData;

		const body: IDataObject = {};
		const qs: IDataObject = {};

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		for (let i = 0; i < items.length; i++) {
			// https://docs.frappe.io/framework/user/en/api/rest
			// https://frappeframework.com/docs/user/en/guides/integration/rest_api/manipulating_documents

			if (resource === 'document') {
				// *********************************************************************
				//                             document
				// *********************************************************************

				if (operation === 'get') {
					// ----------------------------------
					//          document: get
					// ----------------------------------

					// https://docs.frappe.io/framework/user/en/api/rest#read

					const docType = this.getNodeParameter('docType', i) as string;
					const documentName = this.getNodeParameter('documentName', i) as string;

					responseData = await erpNextApiRequest.call(
						this,
						'GET',
						`/api/resource/${docType}/${documentName}`,
					);
					responseData = responseData.data;
				}

				if (operation === 'getAll') {
					// ----------------------------------
					//         document: getAll
					// ----------------------------------

					// https://docs.frappe.io/framework/user/en/api/rest#listing-documents

					const docType = this.getNodeParameter('docType', i) as string;
					const endpoint = `/api/resource/${docType}`;

					const { fields, filters } = this.getNodeParameter('options', i) as {
						fields: string[];
						filters: {
							customProperty: Array<{ field: string; operator: string; value: string }>;
						};
					};

					// fields=["test", "example", "hi"]
					if (fields) {
						if (fields.includes('*')) {
							qs.fields = JSON.stringify(['*']);
						} else {
							qs.fields = JSON.stringify(fields);
						}
					}
					// filters=[["Person","first_name","=","Jane"]]
					// TODO: filters not working
					if (filters?.customProperty) {
						qs.filters = JSON.stringify(
							filters.customProperty.map((filter) => {
								return [docType, filter.field, toSQL(filter.operator), filter.value];
							}),
						);
					}

					const returnAll = this.getNodeParameter('returnAll', i);

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i);
						qs.limit_page_length = limit;
						qs.limit_start = 0;
						responseData = await erpNextApiRequest.call(this, 'GET', endpoint, {}, qs);
						responseData = responseData.data;
					} else {
						responseData = await erpNextApiRequestAllItems.call(
							this,
							'data',
							'GET',
							endpoint,
							{},
							qs,
						);
					}
				} else if (operation === 'create') {
					// ----------------------------------
					//         document: create
					// ----------------------------------

					// https://docs.frappe.io/framework/user/en/api/rest#create

					const properties = this.getNodeParameter('properties', i) as DocumentProperties;

					if (!properties?.customProperty?.length) {
						throw new NodeOperationError(
							this.getNode(),
							'Please enter at least one property for the document to create.',
							{ itemIndex: i },
						);
					}

					properties.customProperty.forEach((property) => {
						body[property.field] = property.value;
					});

					const docType = this.getNodeParameter('docType', i) as string;

					responseData = await erpNextApiRequest.call(
						this,
						'POST',
						`/api/resource/${docType}`,
						body,
					);
					responseData = responseData.data;
				} else if (operation === 'delete') {
					// ----------------------------------
					//         document: delete
					// ----------------------------------

					// https://docs.frappe.io/framework/user/en/api/rest#delete

					const docType = this.getNodeParameter('docType', i) as string;
					const documentName = this.getNodeParameter('documentName', i) as string;

					responseData = await erpNextApiRequest.call(
						this,
						'DELETE',
						`/api/resource/${docType}/${documentName}`,
					);
				} else if (operation === 'update') {
					// ----------------------------------
					//         document: update
					// ----------------------------------

					// https://docs.frappe.io/framework/user/en/api/rest#update

					const properties = this.getNodeParameter('properties', i) as DocumentProperties;

					if (!properties?.customProperty?.length) {
						throw new NodeOperationError(
							this.getNode(),
							'Please enter at least one property for the document to update.',
							{ itemIndex: i },
						);
					}

					properties.customProperty.forEach((property) => {
						body[property.field] = property.value;
					});

					const docType = this.getNodeParameter('docType', i) as string;
					const documentName = this.getNodeParameter('documentName', i) as string;

					responseData = await erpNextApiRequest.call(
						this,
						'PUT',
						`/api/resource/${docType}/${documentName}`,
						body,
					);
					responseData = responseData.data;
				}
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject[]),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		}
		return [returnData];
	}
}
