import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { contenfulApiRequestAllItems, contentfulApiRequest } from './GenericFunctions';

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
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:contentful.png',
		group: ['input'],
		version: 1,
		description: 'Consume Contenful API',
		defaults: {
			name: 'Contentful',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'contentfulApi',
				required: true,
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
						value: 'deliveryApi',
					},
					{
						name: 'Preview API',
						value: 'previewApi',
					},
				],
			},
			// Resources:
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					AssetDescription.resource,
					ContentTypeDescription.resource,
					EntryDescription.resource,
					LocaleDescription.resource,
					SpaceDescription.resource,
				],
				default: 'entry',
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
		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		let responseData;

		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const qs: Record<string, string | number> = {};

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'space') {
					if (operation === 'get') {
						const credentials = await this.getCredentials('contentfulApi');

						responseData = await contentfulApiRequest.call(
							this,
							'GET',
							`/spaces/${credentials?.spaceId}`,
						);
					}
				}
				if (resource === 'contentType') {
					if (operation === 'get') {
						const credentials = await this.getCredentials('contentfulApi');

						const env = this.getNodeParameter('environmentId', 0) as string;

						const id = this.getNodeParameter('contentTypeId', 0) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						responseData = await contentfulApiRequest.call(
							this,
							'GET',
							`/spaces/${credentials?.spaceId}/environments/${env}/content_types/${id}`,
						);

						if (!additionalFields.rawData) {
							responseData = responseData.fields;
						}
					}
				}
				if (resource === 'entry') {
					if (operation === 'get') {
						const credentials = await this.getCredentials('contentfulApi');

						const env = this.getNodeParameter('environmentId', 0) as string;

						const id = this.getNodeParameter('entryId', 0) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						responseData = await contentfulApiRequest.call(
							this,
							'GET',
							`/spaces/${credentials?.spaceId}/environments/${env}/entries/${id}`,
							{},
							qs,
						);

						if (!additionalFields.rawData) {
							responseData = responseData.fields;
						}
					} else if (operation === 'getAll') {
						const credentials = await this.getCredentials('contentfulApi');

						const returnAll = this.getNodeParameter('returnAll', 0);

						const additionalFields = this.getNodeParameter('additionalFields', i);
						const rawData = additionalFields.rawData;
						additionalFields.rawData = undefined;

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
							responseData = await contenfulApiRequestAllItems.call(
								this,
								'items',
								'GET',
								`/spaces/${credentials?.spaceId}/environments/${env}/entries`,
								{},
								qs,
							);

							if (!rawData) {
								const assets: IDataObject[] = [];

								responseData.map((asset: any) => {
									assets.push(asset.fields as IDataObject);
								});
								responseData = assets;
							}
						} else {
							const limit = this.getNodeParameter('limit', 0);
							qs.limit = limit;
							responseData = await contentfulApiRequest.call(
								this,
								'GET',
								`/spaces/${credentials?.spaceId}/environments/${env}/entries`,
								{},
								qs,
							);
							responseData = responseData.items;

							if (!rawData) {
								const assets: IDataObject[] = [];

								responseData.map((asset: any) => {
									assets.push(asset.fields as IDataObject);
								});
								responseData = assets;
							}
						}
					}
				}
				if (resource === 'asset') {
					if (operation === 'get') {
						const credentials = await this.getCredentials('contentfulApi');

						const env = this.getNodeParameter('environmentId', 0) as string;

						const id = this.getNodeParameter('assetId', 0) as string;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						responseData = await contentfulApiRequest.call(
							this,
							'GET',
							`/spaces/${credentials?.spaceId}/environments/${env}/assets/${id}`,
							{},
							qs,
						);

						if (!additionalFields.rawData) {
							responseData = responseData.fields;
						}
					} else if (operation === 'getAll') {
						const credentials = await this.getCredentials('contentfulApi');

						const returnAll = this.getNodeParameter('returnAll', 0);

						const additionalFields = this.getNodeParameter('additionalFields', i);
						const rawData = additionalFields.rawData;
						additionalFields.rawData = undefined;

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
							responseData = await contenfulApiRequestAllItems.call(
								this,
								'items',
								'GET',
								`/spaces/${credentials?.spaceId}/environments/${env}/assets`,
								{},
								qs,
							);

							if (!rawData) {
								const assets: IDataObject[] = [];

								responseData.map((asset: any) => {
									assets.push(asset.fields as IDataObject);
								});
								responseData = assets;
							}
						} else {
							const limit = this.getNodeParameter('limit', i);
							qs.limit = limit;
							responseData = await contentfulApiRequest.call(
								this,
								'GET',
								`/spaces/${credentials?.spaceId}/environments/${env}/assets`,
								{},
								qs,
							);
							responseData = responseData.items;

							if (!rawData) {
								const assets: IDataObject[] = [];

								responseData.map((asset: any) => {
									assets.push(asset.fields as IDataObject);
								});
								responseData = assets;
							}
						}
					}
				}
				if (resource === 'locale') {
					if (operation === 'getAll') {
						const credentials = await this.getCredentials('contentfulApi');

						const returnAll = this.getNodeParameter('returnAll', 0);

						const env = this.getNodeParameter('environmentId', i) as string;

						if (returnAll) {
							responseData = await contenfulApiRequestAllItems.call(
								this,
								'items',
								'GET',
								`/spaces/${credentials?.spaceId}/environments/${env}/locales`,
								{},
								qs,
							);
						} else {
							const limit = this.getNodeParameter('limit', 0);
							qs.limit = limit;
							responseData = await contentfulApiRequest.call(
								this,
								'GET',
								`/spaces/${credentials?.spaceId}/environments/${env}/locales`,
								{},
								qs,
							);
							responseData = responseData.items;
						}
					}
				}
				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
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
