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
	contentfulApiRequest,
	contenfulApiRequestAllItems,
} from './GenericFunctions';

import * as SpaceDescription from './SpaceDescription';
import * as ContentTypeDescription from './ContentTypeDescription';
import * as EntryDescription from './EntryDescription';
import * as AssetDescription from './AssetDescription';
import * as LocaleDescription from './LocaleDescription';

export class Contentful implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Contentful',
		name: 'contentful',
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		icon: 'file:contentful.png',
		group: ['input'],
		version: 1,
		description: 'Consume Contenful API',
		defaults: {
			name: 'Contentful',
			color: '#2E75D4'
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'contentfulApi',
				required: true
			},
		],
		properties: [
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				default: 'deliveryApi',
				description: 'Pick where your data comes from, delivery or preview API',
				options: [
					{
						name: 'Delivery API',
						value: 'deliveryApi'
					},
					{
						name: 'Preview API',
						value: 'previewApi'
					},
				],
			},
			// Resources:
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					AssetDescription.resource,
					ContentTypeDescription.resource,
					EntryDescription.resource,
					LocaleDescription.resource,
					SpaceDescription.resource,
				],
				default: 'entry',
				description: 'The resource to operate on.'
			},

			// Operations:
			...SpaceDescription.operations,
			...ContentTypeDescription.operations,
			...EntryDescription.operations,
			...AssetDescription.operations,
			...LocaleDescription.operations,

			// Resource specific fields:
			...SpaceDescription.fields,
			...ContentTypeDescription.fields,
			...EntryDescription.fields,
			...AssetDescription.fields,
			...LocaleDescription.fields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		let responseData;

		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const qs: Record<string, string | number> = {};

		for (let i = 0; i < items.length; i++) {
			if (resource === 'space') {
				if (operation === 'get') {

					const credentials = this.getCredentials('contentfulApi');

					responseData = await contentfulApiRequest.call(this, 'GET', `/spaces/${credentials?.spaceId}`);
				}
			}
			if (resource === 'contentType') {
				if (operation === 'get') {

					const credentials = this.getCredentials('contentfulApi');

					const env = this.getNodeParameter('environmentId', 0) as string;

					const id = this.getNodeParameter('contentTypeId', 0) as string;

					responseData = await contentfulApiRequest.call(this, 'GET', `/spaces/${credentials?.spaceId}/environments/${env}/content_types/${id}`);
				}
			}
			if (resource === 'entry') {

				if (operation === 'get') {

					const credentials = this.getCredentials('contentfulApi');

					const env = this.getNodeParameter('environmentId', 0) as string;

					const id = this.getNodeParameter('entryId', 0) as string;

					responseData = await contentfulApiRequest.call(this, 'GET', `/spaces/${credentials?.spaceId}/environments/${env}/entries/${id}`, {}, qs);

				} else if (operation === 'getAll') {
					const credentials = this.getCredentials('contentfulApi');

					const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const env = this.getNodeParameter('environmentId', i) as string;

					Object.assign(qs, additionalFields);

					if (qs.equal) {
						const [atribute, value] = (qs.equal as string).split('=');
						qs[atribute] = value;
						delete qs.equal;
					}

					if (qs.notEqual) {
						const [atribute, value] = (qs.notEqual as string).split('=');
						qs[atribute] = value;
						delete qs.notEqual;
					}

					if (qs.include) {
						const [atribute, value] = (qs.include as string).split('=');
						qs[atribute] = value;
						delete qs.include;
					}

					if (qs.exclude) {
						const [atribute, value] = (qs.exclude as string).split('=');
						qs[atribute] = value;
						delete qs.exclude;
					}

					if (returnAll) {
						responseData = await contenfulApiRequestAllItems.call(this, 'items', 'GET', `/spaces/${credentials?.spaceId}/environments/${env}/entries`, {}, qs);
					} else {
						const limit = this.getNodeParameter('limit', 0) as number;
						qs.limit = limit;
						responseData = await contentfulApiRequest.call(this, 'GET', `/spaces/${credentials?.spaceId}/environments/${env}/entries`, {}, qs);
						responseData = responseData.items;
					}
				}
			}
			if (resource === 'asset') {
				if (operation === 'get') {

					const credentials = this.getCredentials('contentfulApi');

					const env = this.getNodeParameter('environmentId', 0) as string;

					const id = this.getNodeParameter('assetId', 0) as string;

					responseData = await contentfulApiRequest.call(this, 'GET', `/spaces/${credentials?.spaceId}/environments/${env}/assets/${id}`, {}, qs);

				} else if (operation === 'getAll') {

					const credentials = this.getCredentials('contentfulApi');

					const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					const env = this.getNodeParameter('environmentId', i) as string;

					Object.assign(qs, additionalFields);

					if (qs.equal) {
						const [atribute, value] = (qs.equal as string).split('=');
						qs[atribute] = value;
						delete qs.equal;
					}

					if (qs.notEqual) {
						const [atribute, value] = (qs.notEqual as string).split('=');
						qs[atribute] = value;
						delete qs.notEqual;
					}

					if (qs.include) {
						const [atribute, value] = (qs.include as string).split('=');
						qs[atribute] = value;
						delete qs.include;
					}

					if (qs.exclude) {
						const [atribute, value] = (qs.exclude as string).split('=');
						qs[atribute] = value;
						delete qs.exclude;
					}

					if (returnAll) {
						responseData = await contenfulApiRequestAllItems.call(this, 'items', 'GET', `/spaces/${credentials?.spaceId}/environments/${env}/assets`, {}, qs);
					} else {
						const limit = this.getNodeParameter('limit', 0) as number;
						qs.limit = limit;
						responseData = await contentfulApiRequest.call(this, 'GET', `/spaces/${credentials?.spaceId}/environments/${env}/assets`, {}, qs);
						responseData = responseData.items;
					}
				}
			}
			if (resource === 'locale') {

				if (operation === 'getAll') {

					const credentials = this.getCredentials('contentfulApi');

					const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

					const env = this.getNodeParameter('environmentId', i) as string;

					if (returnAll) {
						responseData = await contenfulApiRequestAllItems.call(this, 'items', 'GET', `/spaces/${credentials?.spaceId}/environments/${env}/locales`, {}, qs);
					} else {
						const limit = this.getNodeParameter('limit', 0) as number;
						qs.limit = limit;
						responseData = await contentfulApiRequest.call(this, 'GET', `/spaces/${credentials?.spaceId}/environments/${env}/locales`, {}, qs);
						responseData = responseData.items;
					}
				}
			}
			if (Array.isArray(responseData)) {
				returnData.push.apply(returnData, responseData as IDataObject[]);
			} else {
				returnData.push(responseData as IDataObject);
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
