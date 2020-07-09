import { IExecuteFunctions } from 'n8n-core';
import { IDataObject, INodeExecutionData, INodeType, INodeTypeDescription, NodePropertyTypes } from 'n8n-workflow';

import { contentfulApiRequest } from './ GenericFunctions';
import resolveResponse from './resolveResponse';

import * as SpaceDescription from './SpaceDescription';
import * as ContentTypeDescription from './ContentTypeDescription';
import * as EntryDescription from './EntryDescription';
import * as AssetDescription from './AssetDescription';
import * as LocaleDescription from './LocaleDescription';
import * as SearchParameterDescription from './SearchParameterDescription';

export class Contentful implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Contentful',
		name: 'contentful',
		icon: 'file:contentful.png',
		group: ['input'],
		version: 1,
		description: "Access data through Contentful's Content Delivery API",
		defaults: {
			name: 'Contentful',
			color: '#2E75D4'
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'contentfulDeliveryApi',
				required: true
			}
		],
		properties: [
			// Common fields:
			{
				displayName: 'Source',
				name: 'source',
				type: 'options' as NodePropertyTypes,
				default: 'Delivery API',
				description: 'Pick where your data comes from, delivery or preview API',
				options: [
					{
						name: 'Delivery API',
						value: 'delivery_api'
					},
					{
						name: 'Preview API',
						value: 'preview_api'
					}
				]
			},
			{
				displayName: 'Environment Id',
				name: 'environment_id',
				type: 'string' as NodePropertyTypes,
				default: '',
				description:
					'The id for the Contentful environment (e.g. master, staging, etc.). Depending on your plan, you might not have environments. In that case use "master".'
			},

			// Resources:
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					SpaceDescription.resource,
					ContentTypeDescription.resource,
					EntryDescription.resource,
					AssetDescription.resource,
					LocaleDescription.resource
				],
				default: '',
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

			// Options:
			...SearchParameterDescription.fields
		]
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const environmentId = this.getNodeParameter('environment_id', 0) as string;
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const qs: Record<string, string | number> = {};

		for (let i = 0; i < items.length; i++) {
			if (resource === 'space') {
				if (operation === 'get_space') {
					const res = await contentfulApiRequest(this);
					returnData.push(res);
				}
			} else if (resource === 'content_type') {
				if (operation === 'get_content_types') {
					const res = await contentfulApiRequest(this, '/content_types', environmentId);
					const resolvedData = resolveResponse(res, {});
					returnData.push(...resolvedData);
				} else if (operation === 'get_content_type') {
					const id = this.getNodeParameter('content_type_id', 0) as string;
					const res = await contentfulApiRequest(this, `/content_types/${id}`, environmentId);
					returnData.push(...res.items);
				}
			} else if (resource === 'entry') {
				if (operation === 'get_entries') {
					const shouldResolve = this.getNodeParameter('resolve', 0) as boolean;
					if (shouldResolve) qs.include = this.getNodeParameter('include', 0) as number;
					const searchParameters = this.getNodeParameter('search_parameters', 0) as IDataObject;
					if (searchParameters.parameters && Array.isArray(searchParameters.parameters)) {
						searchParameters.parameters.forEach(parameter => {
							const { name, value } = parameter as { name: string; value: string };
							qs[name] = value;
						});
					}
					const res = await contentfulApiRequest(this, '/entries', environmentId, qs);
					const resolvedData = shouldResolve ? resolveResponse(res, {}) : res.items;
					returnData.push(...resolvedData);
				} else if (operation === 'get_entry') {
					const id = this.getNodeParameter('entry_id', 0) as string;
					const res = await contentfulApiRequest(this, `/entries/${id}`, environmentId);
					returnData.push(res);
				}
			} else if (resource === 'asset') {
				if (operation === 'get_assets') {
					const res = await contentfulApiRequest(this, '/assets', environmentId);
					returnData.push(...res.items);
				} else if (operation === 'get_asset') {
					const id = this.getNodeParameter('asset_id', 0) as string;
					const res = await contentfulApiRequest(this, `/assets/${id}`, environmentId);
					returnData.push(res);
				}
			} else if (resource === 'locale') {
				if (operation === 'get_locales') {
					const res = await contentfulApiRequest(this, '/locales', environmentId);
					returnData.push(res);
				}
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
