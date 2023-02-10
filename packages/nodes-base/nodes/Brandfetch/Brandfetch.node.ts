import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { brandfetchApiRequest } from './GenericFunctions';

export class Brandfetch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Brandfetch',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-name-miscased
		name: 'Brandfetch',
		// eslint-disable-next-line n8n-nodes-base/node-class-description-icon-not-svg
		icon: 'file:brandfetch.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Consume Brandfetch API',
		defaults: {
			name: 'Brandfetch',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'brandfetchApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Color',
						value: 'color',
						description: "Return a company's colors",
						action: "Return a company's colors",
					},
					{
						name: 'Company',
						value: 'company',
						description: "Return a company's data",
						action: "Return a company's data",
					},
					{
						name: 'Font',
						value: 'font',
						description: "Return a company's fonts",
						action: "Return a company's fonts",
					},
					{
						name: 'Industry',
						value: 'industry',
						description: "Return a company's industry",
						action: "Return a company's industry",
					},
					{
						name: 'Logo',
						value: 'logo',
						description: "Return a company's logo & icon",
						action: "Return a company's logo & icon",
					},
				],
				default: 'logo',
			},

			// ----------------------------------
			//         All
			// ----------------------------------
			{
				displayName: 'Domain',
				name: 'domain',
				type: 'string',
				default: '',
				description: 'The domain name of the company',
				required: true,
			},
			{
				displayName: 'Download',
				name: 'download',
				type: 'boolean',
				default: false,
				required: true,
				displayOptions: {
					show: {
						operation: ['logo'],
					},
				},
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description: 'Name of the binary property to which to write the data of the read file',
			},
			{
				displayName: 'Image Type',
				name: 'imageTypes',
				type: 'multiOptions',
				displayOptions: {
					show: {
						operation: ['logo'],
						download: [true],
					},
				},
				options: [
					{
						name: 'Icon',
						value: 'icon',
					},
					{
						name: 'Logo',
						value: 'logo',
					},
				],
				default: ['logo', 'icon'],
				required: true,
			},
			{
				displayName: 'Image Format',
				name: 'imageFormats',
				type: 'multiOptions',
				displayOptions: {
					show: {
						operation: ['logo'],
						download: [true],
					},
				},
				options: [
					{
						name: 'PNG',
						value: 'png',
					},
					{
						name: 'SVG',
						value: 'svg',
					},
				],
				default: ['png'],
				description: 'The image format in which the logo should be returned as',
				required: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length;

		const operation = this.getNodeParameter('operation', 0);
		const responseData: INodeExecutionData[] = [];
		for (let i = 0; i < length; i++) {
			try {
				if (operation === 'logo') {
					const domain = this.getNodeParameter('domain', i) as string;
					const download = this.getNodeParameter('download', i);

					const body: IDataObject = {
						domain,
					};

					const response = await brandfetchApiRequest.call(this, 'POST', '/logo', body);

					if (download) {
						const imageTypes = this.getNodeParameter('imageTypes', i) as string[];

						const imageFormats = this.getNodeParameter('imageFormats', i) as string[];

						const newItem: INodeExecutionData = {
							json: {},
							binary: {},
						};

						if (items[i].binary !== undefined) {
							// Create a shallow copy of the binary data so that the old
							// data references which do not get changed still stay behind
							// but the incoming data does not get changed.
							Object.assign(newItem.binary!, items[i].binary);
						}

						newItem.json = response.response;

						for (const imageType of imageTypes) {
							for (const imageFormat of imageFormats) {
								const url = response.response[imageType][
									imageFormat === 'png' ? 'image' : imageFormat
								] as string;

								if (url !== null) {
									const data = await brandfetchApiRequest.call(this, 'GET', '', {}, {}, url, {
										json: false,
										encoding: null,
									});

									newItem.binary![`${imageType}_${imageFormat}`] =
										await this.helpers.prepareBinaryData(
											data,
											`${imageType}_${domain}.${imageFormat}`,
										);

									items[i] = newItem;
								}
								items[i] = newItem;
							}
						}
						if (Object.keys(items[i].binary!).length === 0) {
							delete items[i].binary;
						}
					} else {
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response.response),
							{ itemData: { item: i } },
						);
						responseData.push(...executionData);
					}
				}
				if (operation === 'color') {
					const domain = this.getNodeParameter('domain', i) as string;

					const body: IDataObject = {
						domain,
					};

					const response = await brandfetchApiRequest.call(this, 'POST', '/color', body);
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(response),
						{ itemData: { item: i } },
					);
					responseData.push(...executionData);
				}
				if (operation === 'font') {
					const domain = this.getNodeParameter('domain', i) as string;

					const body: IDataObject = {
						domain,
					};

					const response = await brandfetchApiRequest.call(this, 'POST', '/font', body);
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(response),
						{ itemData: { item: i } },
					);
					responseData.push(...executionData);
				}
				if (operation === 'company') {
					const domain = this.getNodeParameter('domain', i) as string;

					const body: IDataObject = {
						domain,
					};

					const response = await brandfetchApiRequest.call(this, 'POST', '/company', body);
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(response),
						{ itemData: { item: i } },
					);
					responseData.push(...executionData);
				}
				if (operation === 'industry') {
					const domain = this.getNodeParameter('domain', i) as string;

					const body: IDataObject = {
						domain,
					};

					const response = await brandfetchApiRequest.call(this, 'POST', '/industry', body);

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(response),
						{ itemData: { item: i } },
					);
					responseData.push(...executionData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: error.message, json: {}, itemIndex: i });
					continue;
				}
				throw error;
			}
		}

		if (operation === 'logo' && this.getNodeParameter('download', 0)) {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else {
			return [responseData];
		}
	}
}
