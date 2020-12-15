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
	brandfetchApiRequest,
} from './GenericFunctions';

export class Brandfetch implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Brandfetch',
		name: 'Brandfetch',
		icon: 'file:brandfetch.png',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Consume Brandfetch API',
		defaults: {
			name: 'Brandfetch',
			color: '#1f1f1f',
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
				options: [
					{
						name: 'Logo',
						value: 'logo',
						description: 'Return a company\'s logo & icon',
					},
					{
						name: 'Color',
						value: 'color',
						description: 'Return a company\'s colors',
					},
					{
						name: 'Font',
						value: 'font',
						description: 'Return a company\'s fonts',
					},
					{
						name: 'Company',
						value: 'company',
						description: 'Return a company\'s data',
					},
					{
						name: 'Industry',
						value: 'industry',
						description: 'Return a company\'s industry',
					},
				],
				default: 'logo',
				description: 'The operation to perform',
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
						operation: [
							'logo',
						],
					},
				},
				description: 'Name of the binary property to which to<br />write the data of the read file.',
			},
			{
				displayName: 'Image Type',
				name: 'imageTypes',
				type: 'multiOptions',
				displayOptions: {
					show: {
						operation: [
							'logo',
						],
						download: [
							true,
						],
					},
				},
				options: [
					{
						name: 'Logo',
						value: 'logo',
					},
					{
						name: 'Icon',
						value: 'icon',
					},
				],
				default: [
					'logo',
					'icon',
				],
				description: '',
				required: true,
			},
			{
				displayName: 'Image Format',
				name: 'imageFormats',
				type: 'multiOptions',
				displayOptions: {
					show: {
						operation: [
							'logo',
						],
						download: [
							true,
						],
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
				default: [
					'svg',
				],
				description: '',
				required: true,
			},
			{
				displayName: 'Image Prefix',
				name: 'imagePrefix',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: [
							'logo',
						],
						download: [
							true,
						],
					},
				},
				description: 'Name of the binary property to which to<br />write the data of the read file.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length as unknown as number;

		const operation = this.getNodeParameter('operation', 0) as string;
		const responseData = [];
		for (let i = 0; i < length; i++) {
			if (operation === 'logo') {
				const domain = this.getNodeParameter('domain', i) as string;
				const download = this.getNodeParameter('download', i) as boolean;

				const body: IDataObject = {
					domain,
				};

				const response = await brandfetchApiRequest.call(this, 'POST', `/logo`, body);

				if (download === true) {

					const imageTypes = this.getNodeParameter('imageTypes', i) as string[];

					const imageFormats = this.getNodeParameter('imageFormats', i) as string[];

					const imagePrefix = this.getNodeParameter('imagePrefix', i) as string;

					const newItem: INodeExecutionData = {
						json: {},
						binary: {},
					};

					if (items[i].binary !== undefined) {
						// Create a shallow copy of the binary data so that the old
						// data references which do not get changed still stay behind
						// but the incoming data does not get changed.
						Object.assign(newItem.binary, items[i].binary);
					}

					newItem.json = response.response;

					for (const imageType of imageTypes) {
						for (const imageFormat of imageFormats) {

							const url = response.response[imageType][(imageFormat === 'png') ? 'image' : imageFormat] as string;

							if (url !== null) {
								const data = await brandfetchApiRequest.call(this, 'GET', '', {}, {}, url, { json: false, encoding: null });

								newItem.binary![`${imagePrefix}_${imageType}_${imageFormat}`] = await this.helpers.prepareBinaryData(data, `${imageType}_${domain}.${imageFormat}`);

								items[i] = newItem;
							}
							items[i] = newItem;
						}
					}
					if (Object.keys(items[i].binary!).length === 0) {
						delete items[i].binary;
					}
				} else {
					responseData.push(response.response);
				}
			}
			if (operation === 'color') {
				const domain = this.getNodeParameter('domain', i) as string;

				const body: IDataObject = {
					domain,
				};

				const response = await brandfetchApiRequest.call(this, 'POST', `/color`, body);
				responseData.push(response.response);
			}
			if (operation === 'font') {
				const domain = this.getNodeParameter('domain', i) as string;

				const body: IDataObject = {
					domain,
				};

				const response = await brandfetchApiRequest.call(this, 'POST', `/font`, body);
				responseData.push(response.response);
			}
			if (operation === 'company') {
				const domain = this.getNodeParameter('domain', i) as string;

				const body: IDataObject = {
					domain,
				};

				const response = await brandfetchApiRequest.call(this, 'POST', `/company`, body);
				responseData.push(response.response);
			}
			if (operation === 'industry') {
				const domain = this.getNodeParameter('domain', i) as string;

				const body: IDataObject = {
					domain,
				};

				const response = await brandfetchApiRequest.call(this, 'POST', `/industry`, body);
				responseData.push.apply(responseData, response.response);
			}
		}

		if (operation === 'logo' && this.getNodeParameter('download', 0) === true) {
			// For file downloads the files get attached to the existing items
			return this.prepareOutputData(items);
		} else {
			return [this.helpers.returnJsonArray(responseData)];
		}
	}
}
