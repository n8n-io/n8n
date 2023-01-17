import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	jsonParse,
} from 'n8n-workflow';

import { elasticsearchApiRequest, elasticsearchApiRequestAllItems } from './GenericFunctions';

import { documentFields, documentOperations, indexFields, indexOperations } from './descriptions';

import { DocumentGetAllOptions, FieldsUiValues } from './types';

import { omit } from 'lodash';

export class Elasticsearch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Elasticsearch',
		name: 'elasticsearch',
		icon: 'file:elasticsearch.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Elasticsearch API',
		defaults: {
			name: 'Elasticsearch',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'elasticsearchApi',
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
					{
						name: 'Index',
						value: 'index',
					},
				],
				default: 'document',
			},
			...documentOperations,
			...documentFields,
			...indexOperations,
			...indexFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as 'document' | 'index';
		const operation = this.getNodeParameter('operation', 0);

		let responseData;

		for (let i = 0; i < items.length; i++) {
			if (resource === 'document') {
				// **********************************************************************
				//                                document
				// **********************************************************************

				if (operation === 'delete') {
					// ----------------------------------------
					//             document: delete
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-delete.html

					const indexId = this.getNodeParameter('indexId', i);
					const documentId = this.getNodeParameter('documentId', i);

					const endpoint = `/${indexId}/_doc/${documentId}`;
					responseData = await elasticsearchApiRequest.call(this, 'DELETE', endpoint);
				} else if (operation === 'get') {
					// ----------------------------------------
					//              document: get
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-get.html

					const indexId = this.getNodeParameter('indexId', i);
					const documentId = this.getNodeParameter('documentId', i);

					const qs = {} as IDataObject;
					const options = this.getNodeParameter('options', i);

					if (Object.keys(options).length) {
						Object.assign(qs, options);
						qs._source = true;
					}

					const endpoint = `/${indexId}/_doc/${documentId}`;
					responseData = await elasticsearchApiRequest.call(this, 'GET', endpoint, {}, qs);

					const simple = this.getNodeParameter('simple', i) as IDataObject;

					if (simple) {
						responseData = {
							_id: responseData._id,
							...responseData._source,
						};
					}
				} else if (operation === 'getAll') {
					// ----------------------------------------
					//            document: getAll
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/search-search.html

					const indexId = this.getNodeParameter('indexId', i);

					const body = {} as IDataObject;
					const qs = {} as IDataObject;
					const options = this.getNodeParameter('options', i) as DocumentGetAllOptions;
					// const paginate = this.getNodeParameter('paginate', i) as boolean;

					if (Object.keys(options).length) {
						const { query, ...rest } = options;
						if (query) {
							Object.assign(
								body,
								jsonParse(query, { errorMessage: "Invalid JSON in 'Query' option" }),
							);
						}
						Object.assign(qs, rest);
						qs._source = true;
					}

					const returnAll = this.getNodeParameter('returnAll', 0);

					if (returnAll) {
						//Defines the number of hits to return. Defaults to 10. By default, you cannot page through more than 10,000 hits
						qs.size = 10000;
						if (qs.sort) {
							responseData = await elasticsearchApiRequestAllItems.call(
								this,
								indexId as string,
								body,
								qs,
							);
						} else {
							responseData = await elasticsearchApiRequest.call(
								this,
								'GET',
								`/${indexId}/_search`,
								body,
								qs,
							);
							responseData = responseData.hits.hits;
						}
					} else {
						qs.size = this.getNodeParameter('limit', 0);

						responseData = await elasticsearchApiRequest.call(
							this,
							'GET',
							`/${indexId}/_search`,
							body,
							qs,
						);
						responseData = responseData.hits.hits;
					}

					const simple = this.getNodeParameter('simple', 0) as IDataObject;

					if (simple) {
						responseData = responseData.map((item: IDataObject) => {
							return {
								_id: item._id,
								...(item._source as IDataObject),
							};
						});
					}
				} else if (operation === 'create') {
					// ----------------------------------------
					//             document: create
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-index_.html

					const body: IDataObject = {};

					const dataToSend = this.getNodeParameter('dataToSend', 0) as
						| 'defineBelow'
						| 'autoMapInputData';

					if (dataToSend === 'defineBelow') {
						const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as FieldsUiValues;
						fields.forEach(({ fieldId, fieldValue }) => (body[fieldId] = fieldValue));
					} else {
						const inputData = items[i].json;
						const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
						const inputsToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());

						for (const key of Object.keys(inputData)) {
							if (inputsToIgnore.includes(key)) continue;
							body[key] = inputData[key];
						}
					}

					const qs = {} as IDataObject;
					const additionalFields = this.getNodeParameter('additionalFields', i);

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, omit(additionalFields, ['documentId']));
					}

					const indexId = this.getNodeParameter('indexId', i);
					const { documentId } = additionalFields;

					if (documentId) {
						const endpoint = `/${indexId}/_doc/${documentId}`;
						responseData = await elasticsearchApiRequest.call(this, 'PUT', endpoint, body);
					} else {
						const endpoint = `/${indexId}/_doc`;
						responseData = await elasticsearchApiRequest.call(this, 'POST', endpoint, body);
					}
				} else if (operation === 'update') {
					// ----------------------------------------
					//             document: update
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-update.html

					const body = { doc: {} } as { doc: { [key: string]: string } };

					const dataToSend = this.getNodeParameter('dataToSend', 0) as
						| 'defineBelow'
						| 'autoMapInputData';

					if (dataToSend === 'defineBelow') {
						const fields = this.getNodeParameter('fieldsUi.fieldValues', i, []) as FieldsUiValues;
						fields.forEach(({ fieldId, fieldValue }) => (body.doc[fieldId] = fieldValue));
					} else {
						const inputData = items[i].json;
						const rawInputsToIgnore = this.getNodeParameter('inputsToIgnore', i) as string;
						const inputsToIgnore = rawInputsToIgnore.split(',').map((c) => c.trim());

						for (const key of Object.keys(inputData)) {
							if (inputsToIgnore.includes(key)) continue;
							body.doc[key] = inputData[key] as string;
						}
					}

					const indexId = this.getNodeParameter('indexId', i);
					const documentId = this.getNodeParameter('documentId', i);

					const endpoint = `/${indexId}/_update/${documentId}`;
					responseData = await elasticsearchApiRequest.call(this, 'POST', endpoint, body);
				}
			} else if (resource === 'index') {
				// **********************************************************************
				//                                 index
				// **********************************************************************

				// https://www.elastic.co/guide/en/elasticsearch/reference/current/indices.html

				if (operation === 'create') {
					// ----------------------------------------
					//              index: create
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-create-index.html

					const indexId = this.getNodeParameter('indexId', i);

					const body = {} as IDataObject;
					const qs = {} as IDataObject;
					const additionalFields = this.getNodeParameter('additionalFields', i);

					if (Object.keys(additionalFields).length) {
						const { aliases, mappings, settings, ...rest } = additionalFields;
						Object.assign(body, aliases, mappings, settings);
						Object.assign(qs, rest);
					}

					responseData = await elasticsearchApiRequest.call(this, 'PUT', `/${indexId}`);
					responseData = { id: indexId, ...responseData };
					delete responseData.index;
				} else if (operation === 'delete') {
					// ----------------------------------------
					//              index: delete
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-delete-index.html

					const indexId = this.getNodeParameter('indexId', i);

					responseData = await elasticsearchApiRequest.call(this, 'DELETE', `/${indexId}`);
					responseData = { success: true };
				} else if (operation === 'get') {
					// ----------------------------------------
					//              index: get
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-get-index.html

					const indexId = this.getNodeParameter('indexId', i) as string;

					const qs = {} as IDataObject;
					const additionalFields = this.getNodeParameter('additionalFields', i);

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, additionalFields);
					}

					responseData = await elasticsearchApiRequest.call(this, 'GET', `/${indexId}`, {}, qs);
					responseData = { id: indexId, ...responseData[indexId] };
				} else if (operation === 'getAll') {
					// ----------------------------------------
					//              index: getAll
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-aliases.html

					responseData = await elasticsearchApiRequest.call(this, 'GET', '/_aliases');
					responseData = Object.keys(responseData).map((index) => ({ indexId: index }));

					const returnAll = this.getNodeParameter('returnAll', i);

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i);
						responseData = responseData.slice(0, limit);
					}
				}
			}
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		}

		return this.prepareOutputData(returnData);
	}
}
