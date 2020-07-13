import {
	IExecuteFunctions,
} from 'n8n-core';
import {
	INodeTypeDescription,
	INodeType,
	INodeExecutionData,
	IDataObject,
} from 'n8n-workflow';
import { documentOperations, documentFields } from './DocumentDescription';
import { erpNextApiRequest, erpNextApiRequestAllItems } from './GenericFunctions';


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
				displayOptions: {
					show: {
						authentication: [
							'accessToken',
						],
					},
				},
			},
			{
				name: 'erpNextOAuth2Api',
				required: true,
				displayOptions: {
					show: {
						authentication: [
							'oAuth2',
						],
					},
				},
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Access Token',
						value: 'accessToken',
					},
					{
						name: 'OAuth2',
						value: 'oAuth2',
					},
				],
				default: 'accessToken',
				description: 'The resource to operate on.',
			},
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
			if (resource === 'document') {
				if (operation === 'get') {
					const docType = this.getNodeParameter('docType', i) as string;
					const documentName = this.getNodeParameter('documentName', i) as string;

					const endpoint = `/api/resource/${docType}/${documentName}`;

					responseData = await erpNextApiRequest.call(this, 'GET', endpoint, {});
				}
				if (operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const docType = this.getNodeParameter('docType', i) as string;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					let endpoint = `/api/resource/${docType}`;

					// Add field options for query. FORMAT: fields=["test", "example", "hi"]
					if (additionalFields.fields as string) {
						let newString : string = '';
						let fields = (additionalFields.fields as string).split(',');
						console.log(fields.length);

						fields.map((field, idx) => {
								newString = newString + `"${field}",`
						});
						// Remove excessive comma at end 
						newString = newString.substring(0, newString.length - 1);

						endpoint = `${endpoint}/?fields=[${newString}]`;
					}

					// Add filter options for query. FORMAT: filters=[["Person","first_name","=","Jane"]]
					if (additionalFields.filters) {
						let newString : string = '';
						const filters = (additionalFields.filters as IDataObject).customProperty as IDataObject[];

						filters.map(filter => {
							let operator : string = '';
							// Operators cannot be used as options in Document description, so must use words and then convert here
							switch(filter.operator) {
								case 'is':
									operator = '=';
									break;
								case 'isNot':
									operator = '!=';
									break;
								case 'greater':
									operator = '>';
									break;
								case 'less':
									operator = '<';
									break;
								case 'equalsGreater':
									operator = '>=';
									break;
								case 'equalsLess':
									operator = '<=';
									break;
							}
							newString = newString + `["${filter.docType}","${filter.field}","${operator}","${filter.value}"],`
						});
						// Remove excessive comma at end 
						newString = newString.substring(0, newString.length - 1);

						// Ensure correct URL based on which queries active
						if (additionalFields.fields) {
							endpoint = `${endpoint}&filters=[${newString}]`;
						} else {
							endpoint = `${endpoint}/?filters=[${newString}]`;
						}
					}

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;
						if (additionalFields.fields || additionalFields.filters) {
							endpoint = `${endpoint}&limit_page_length=${limit}`
						} else {
							endpoint = `${endpoint}/?limit_page_length=${limit}`
						}
						responseData = await erpNextApiRequest.call(this, 'GET', endpoint, {});
					} else {
						if (additionalFields.fields || additionalFields.filters) {
							endpoint = `${endpoint}&limit_start=`
						} else {
							endpoint = `${endpoint}/?limit_start=`
						}
						responseData = await erpNextApiRequestAllItems.call(this, 'GET', endpoint, {});
					}
				}
				if (operation === 'create') {
					const docType = this.getNodeParameter('docType', i) as string;
					const endpoint = `/api/resource/${docType}`;

					const properties = this.getNodeParameter('properties', i) as IDataObject;
					
					if (properties) {
						const fieldsValues = (properties as IDataObject).customProperty as IDataObject[];

						fieldsValues.map(item => {
							//@ts-ignore
							body[item.field] = item.value;	
						});
					}

					responseData = await erpNextApiRequest.call(this, 'POST', endpoint, body);
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

						fieldsValues.map(item => {
							//@ts-ignore
							body[item.field] = item.value;	
						});
					}

					responseData = await erpNextApiRequest.call(this, 'PUT', endpoint, body);
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
