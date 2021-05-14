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

				if (operation === 'get') {

					// ----------------------------------------
					//              document: get
					// ----------------------------------------

					const indexId = this.getNodeParameter('indexId', i);
					const documentId = this.getNodeParameter('documentId', i);

					const qs: IDataObject = {};
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, additionalFields);
					}

					const endpoint = `/${indexId}/_doc/${documentId}`;
					responseData = await elasticSearchApiRequest.call(this, 'GET', endpoint);

				} else if (operation === 'delete') {

					// ----------------------------------------
					//             document: delete
					// ----------------------------------------

					const indexId = this.getNodeParameter('indexId', i);
					const documentId = this.getNodeParameter('documentId', i);

					const qs: IDataObject = {};
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, additionalFields);
					}

					const endpoint = `/${indexId}/_doc/${documentId}`;
					responseData = await elasticSearchApiRequest.call(this, 'DELETE', endpoint);

				} else if (operation === 'getAll') {

					// ----------------------------------------
					//             document: getAll
					// ----------------------------------------

					const body: IDataObject = {};
					const filters = this.getNodeParameter('filters', i) as IDataObject;

					if (Object.keys(filters).length) {
						Object.assign(body, filters);
					}

					const indexId = this.getNodeParameter('indexId', i);

					const qs: IDataObject = {};
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, additionalFields);
					}

					// responseData = await handleListing.call(this, i, 'GET', `/${indexId}/_mget`, body);

				} else if (operation === 'update') {

					// ----------------------------------------
					//             document: update
					// ----------------------------------------

					const body: IDataObject = {
						script: this.getNodeParameter('script', i),
					};

					const indexId = this.getNodeParameter('indexId', i);
					const documentId = this.getNodeParameter('documentId', i);

					const endpoint = `/${indexId}/_update/${documentId}`;
					responseData = await elasticSearchApiRequest.call(this, 'POST', endpoint, body);

				} else if (operation === 'index') {

					// ----------------------------------------
					//             document: index
					// ----------------------------------------

					const body: IDataObject = {
						field: this.getNodeParameter('field', i),
					};

					const indexId = this.getNodeParameter('indexId', i);
					const documentId = this.getNodeParameter('documentId', i);

					const qs: IDataObject = {};
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, additionalFields);
					}

					const endpoint = `/${indexId}/_doc/${documentId}`;
					responseData = await elasticSearchApiRequest.call(this, 'PUT', endpoint, body);

				}

			} else if (resource === 'index') {

				// **********************************************************************
				//                                 index
				// **********************************************************************

				if (operation === 'get') {

					// ----------------------------------------
					//                index: get
					// ----------------------------------------

					const indexId = this.getNodeParameter('indexId', i);

					const qs: IDataObject = {};
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, additionalFields);
					}

					responseData = await elasticSearchApiRequest.call(this, 'GET', `/${indexId}`);

				} else if (operation === 'delete') {

					// ----------------------------------------
					//              index: delete
					// ----------------------------------------

					const indexId = this.getNodeParameter('indexId', i);

					const qs: IDataObject = {};
					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (Object.keys(additionalFields).length) {
						Object.assign(qs, additionalFields);
					}

					responseData = await elasticSearchApiRequest.call(this, 'DELETE', `/${indexId}`);

				} else if (operation === 'create') {

					// ----------------------------------------
					//              index: create
					// ----------------------------------------

					const indexId = this.getNodeParameter('indexId', i);

					responseData = await elasticSearchApiRequest.call(this, 'PUT', `/${indexId}`);

				} else if (operation === 'getAll') {

					// ----------------------------------------
					//              index: getAll
					// ----------------------------------------

					const qs: IDataObject = {
						allow_no_indices: this.getNodeParameter('allow_no_indices', i),
						expand_wildcards: this.getNodeParameter('expand_wildcards', i),
						flat_settings: this.getNodeParameter('flat_settings', i),
						ignore_unavailable: this.getNodeParameter('ignore_unavailable', i),
						include_defaults: this.getNodeParameter('include_defaults', i),
						local: this.getNodeParameter('local', i),
						master_timeout: this.getNodeParameter('master_timeout', i),
					};

					// responseData = await handleListing.call(this, i, 'GET', '/_all', {}, qs);

				} else if (operation === 'search') {

					// ----------------------------------------
					//              index: search
					// ----------------------------------------

					const indexId = this.getNodeParameter('indexId', i);

					const qs: IDataObject = {};

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
