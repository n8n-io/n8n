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
	elasticsearchApiRequest,
} from './GenericFunctions';

import {
	documentFields,
	documentOperations,
	indexFields,
	indexOperations,
} from './descriptions';

import {
	DocumentGetAllAdditionalFields,
} from './types';

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
			color: '#f3d337',
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

		const resource = this.getNodeParameter('resource', 0) as 'document' | 'index';
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < items.length; i++) {

			if (resource === 'document') {

				// **********************************************************************
				//                                document
				// **********************************************************************

				// https://www.elastic.co/guide/en/elasticsearch/reference/current/docs.html

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
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(qs, additionalFields);
							qs._source = true;
						}

						const endpoint = `/${indexId}/_doc/${documentId}`;
						responseData = await elasticsearchApiRequest.call(this, 'GET', endpoint, {}, qs);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//            document: getAll
						// ----------------------------------------

						// https://www.elastic.co/guide/en/elasticsearch/reference/current/search-search.html

						const indexId = this.getNodeParameter('indexId', i);

						const body = {} as IDataObject;
						const qs = {} as IDataObject;
						const additionalFields = this.getNodeParameter('additionalFields', i) as DocumentGetAllAdditionalFields;

						if (Object.keys(additionalFields).length) {
							const { query, ...rest } = additionalFields;
							Object.assign(body, JSON.parse(query));
							Object.assign(qs, rest);
							qs._source = true;
						}

						const returnAll = this.getNodeParameter('returnAll', 0);

						if (!returnAll) {
							qs.size = this.getNodeParameter('limit', 0);
						}
						responseData = await elasticsearchApiRequest.call(this, 'GET', `/${indexId}/_search`, body, qs);
						responseData = responseData.hits.hits;

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
						responseData = await elasticsearchApiRequest.call(this, 'PUT', endpoint, body);

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
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						const { aliases, mappings, settings, ...rest } = additionalFields;
						Object.assign(body, aliases, mappings, settings);
						Object.assign(qs, rest);
					}

					responseData = await elasticsearchApiRequest.call(this, 'PUT', `/${indexId}`);

				} else if (operation === 'delete') {

					// ----------------------------------------
					//              index: delete
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-delete-index.html

					const indexId = this.getNodeParameter('indexId', i);

					responseData = await elasticsearchApiRequest.call(this, 'DELETE', `/${indexId}`);

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

					responseData = await elasticsearchApiRequest.call(this, 'GET', `/${indexId}`, {}, qs);

				} else if (operation === 'getAll') {

					// ----------------------------------------
					//              index: getAll
					// ----------------------------------------

					// https://www.elastic.co/guide/en/elasticsearch/reference/current/indices-aliases.html

					responseData = await elasticsearchApiRequest.call(this, 'GET', '/_aliases');
					responseData = Object.keys(responseData).map(i => ({ indexId: i }));

					const returnAll = this.getNodeParameter('returnAll', i);

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', i) as number;
						responseData = responseData.slice(0, limit);
					}

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
