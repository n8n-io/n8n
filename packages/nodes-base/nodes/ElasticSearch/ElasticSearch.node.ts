import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	elasticSearchApiRequest,
	// handleListing,
} from './GenericFunctions';

import {
	documentFields,
	documentOperations,
	indexFields,
	indexOperations,
} from './descriptions';

export class ElasticSearch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'ElasticSearch',
		name: 'elasticSearch',
		icon: 'file:elasticSearch.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the ElasticSearch API',
		defaults: {
			name: 'ElasticSearch',
			color: '#f3d337',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'elasticSearchApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
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
				description: 'Resource to consume',
			},
			...documentOperations,
			...documentFields,
			...indexOperations,
			...indexFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < items.length; i++) {

			if (resource === 'document') {

				// **********************************************************************
				//                                document
				// **********************************************************************

				// https://www.elastic.co/guide/en/elasticsearch/reference/current/docs.html

				if (operation === 'get') {

					// ----------------------------------------
					//              document: get
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-get.html

					const indexId = this.getNodeParameter('indexId', i);
					const documentId = this.getNodeParameter('documentId', i);

					const qs = {} as IDataObject;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, additionalFields);
					}

					const endpoint = `/${indexId}/_doc/${documentId}`;
					responseData = await elasticSearchApiRequest.call(this, 'GET', endpoint, {}, qs);

				} else if (operation === 'delete') {

					// ----------------------------------------
					//             document: delete
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-delete.html

					const indexId = this.getNodeParameter('indexId', i);
					const documentId = this.getNodeParameter('documentId', i);

					const qs = {} as IDataObject;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, additionalFields);
					}

					const endpoint = `/${indexId}/_doc/${documentId}`;
					responseData = await elasticSearchApiRequest.call(this, 'DELETE', endpoint, {}, qs);

				} else if (operation === 'getAll') {

					// ----------------------------------------
					//             document: getAll
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-multi-get.html

					const body = {} as IDataObject;
					const filters = this.getNodeParameter('filters', i) as IDataObject;

					if (Object.keys(filters).length) {
						Object.assign(body, filters);
					}

					const indexId = this.getNodeParameter('indexId', i);

					const qs = {} as IDataObject;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, additionalFields);
					}

					// responseData = await handleListing.call(this, i, 'GET', `/${indexId}/_mget`, body, qs);

				} else if (operation === 'update') {

					// ----------------------------------------
					//             document: update
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-update.html

					const body = {
						script: this.getNodeParameter('script', i),
					} as IDataObject;

					const indexId = this.getNodeParameter('indexId', i);
					const documentId = this.getNodeParameter('documentId', i);

					const endpoint = `/${indexId}/_update/${documentId}`;
					responseData = await elasticSearchApiRequest.call(this, 'POST', endpoint, body);

				} else if (operation === 'index') {

					// ----------------------------------------
					//             document: index
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-index_.html

					const body = {
						field: this.getNodeParameter('field', i),
					} as IDataObject;

					const indexId = this.getNodeParameter('indexId', i);
					const documentId = this.getNodeParameter('documentId', i);

					const qs = {} as IDataObject;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, additionalFields);
					}

					const endpoint = `/${indexId}/_doc/${documentId}`;
					responseData = await elasticSearchApiRequest.call(this, 'PUT', endpoint, body, qs);

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
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						const { aliases, mappings, settings, ...rest } = additionalFields;
						Object.assign(body, aliases, mappings, settings);
						Object.assign(qs, rest);
					}

					responseData = await elasticSearchApiRequest.call(this, 'PUT', `/${indexId}`);

				} else if (operation === 'delete') {

					// ----------------------------------------
					//              index: delete
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-delete-index.html

					const indexId = this.getNodeParameter('indexId', i);

					responseData = await elasticSearchApiRequest.call(this, 'DELETE', `/${indexId}`);

				} else if (operation === 'get') {

					// ----------------------------------------
					//              index: get
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-get-index.html

					const indexId = this.getNodeParameter('indexId', i);

					const qs = {} as IDataObject;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, additionalFields);
					}

					responseData = await elasticSearchApiRequest.call(this, 'GET', `/${indexId}`, {}, qs);

				} else if (operation === 'getAll') {

					// ----------------------------------------
					//              index: getAll
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-aliases.html

					responseData = await elasticSearchApiRequest.call(this, 'GET', '/_aliases');
					responseData = Object.keys(responseData).map(i => ({ indexId: i }));

					const returnAll = this.getNodeParameter('returnAll', i) as boolean;

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;
						responseData = responseData.slice(0, limit);
					}

				} else if (operation === 'search') {

					// ----------------------------------------
					//              index: search
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/search-search.html

					const indexId = this.getNodeParameter('indexId', i);

					const body = {} as IDataObject;
					const qs = {} as IDataObject;
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						const { query, ...rest } = additionalFields;
						Object.assign(body, query);
						Object.assign(qs, rest);
					}

					responseData = await elasticSearchApiRequest.call(this, 'GET', `/${indexId}/_search`, {}, qs);

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
