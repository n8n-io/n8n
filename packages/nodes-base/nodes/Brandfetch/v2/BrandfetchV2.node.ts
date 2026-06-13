import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeTypeBaseDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { brandfetchApiRequest, fetchAndPrepareBinaryData } from './GenericFunctions';

export class BrandfetchV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: [2],
			subtitle: '={{$parameter["operation"]}}',
			description: 'Consume Brandfetch API',
			defaults: {
				name: 'Brandfetch',
			},
			usableAsTool: true,
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
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
							name: 'Return Logos, Symbols and Icon',
							value: 'logo',
							description: 'Get all logo variants for a brand, including symbols and icons',
							action: "Return a brand's logos, symbols and icon",
						},
						{
							name: 'Return Accent and Brand Colors',
							value: 'colors',
							description: 'Get the accent and brand color palette for a brand',
							action: "Return a brand's accent and brand colors",
						},
						{
							name: "Return All of a Brand's Data",
							value: 'data',
							description:
								'Get all available Brandfetch attributes, including name, description, logos, colors, infographics and other data',
							action: "Return all of a brand's data",
						},
					],
					default: 'data',
				},
				{
					displayName: 'Type',
					name: 'type',
					type: 'options',
					default: 'domain',
					description: 'The type of identifier used to look up the brand',
					required: true,
					options: [
						{
							name: 'Domain',
							value: 'domain',
							description: 'Look up by domain name (e.g. apple.com)',
						},
						{
							name: 'Stock/ETF Ticker',
							value: 'ticker',
							description: 'Look up by stock or ETF ticker (e.g. AAPL)',
						},
						{
							name: 'Crypto Symbol',
							value: 'crypto',
							description: 'Look up by crypto symbol (e.g. BTC)',
						},
						{
							name: 'ISIN',
							value: 'isin',
							description: 'Look up by ISIN (e.g. US0378331005)',
						},
					],
				},
				{
					displayName: 'Identifier',
					name: 'identifier',
					type: 'string',
					default: '',
					description:
						'The identifier of the brand. Format depends on the selected Type (e.g. apple.com, AAPL, BTC, US0378331005).',
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
					description: 'Whether to download all logo files as binary data',
				},
			],
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length;

		const operation = this.getNodeParameter('operation', 0);
		const responseData: INodeExecutionData[] = [];

		for (let i = 0; i < length; i++) {
			try {
				const type = this.getNodeParameter('type', i) as string;
				const identifier = (this.getNodeParameter('identifier', i) as string).trim();
				const resourcePath = `/brands/${encodeURIComponent(type)}/${encodeURIComponent(identifier)}`;

				const response = await brandfetchApiRequest.call(this, 'GET', resourcePath);

				if (operation === 'data') {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(response as IDataObject),
						{ itemData: { item: i } },
					);
					responseData.push.apply(responseData, executionData);
				} else if (operation === 'logo') {
					const download = this.getNodeParameter('download', i);

					if (download) {
						const newItem: INodeExecutionData = {
							json: {},
							binary: {},
						};

						if (items[i].binary !== undefined) {
							Object.assign(newItem.binary!, items[i].binary);
						}

						newItem.json = response.logos;

						const logoUrls = (response.logos as IDataObject[]) ?? [];
						let matchCounter = 0;

						for (const logoUrl of logoUrls) {
							const imageType = logoUrl.type as string | undefined;
							if (!imageType) continue;
							const formats = (logoUrl.formats as IDataObject[]) ?? [];
							for (const logoFormat of formats) {
								const format = logoFormat.format as string | undefined;
								if (!format || !logoFormat.src) continue;
								const suffix = matchCounter === 0 ? '' : `_${matchCounter}`;
								await fetchAndPrepareBinaryData.call(
									this,
									imageType,
									format,
									logoFormat,
									identifier,
									newItem,
									suffix,
								);
								matchCounter++;
							}
						}

						if (Object.keys(newItem.binary!).length === 0) {
							delete newItem.binary;
						}

						const executionData = this.helpers.constructExecutionMetaData([newItem], {
							itemData: { item: i },
						});
						responseData.push.apply(responseData, executionData);
					} else {
						const executionData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray(response.logos as IDataObject),
							{ itemData: { item: i } },
						);
						responseData.push.apply(responseData, executionData);
					}
				} else if (operation === 'colors') {
					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(response.colors as IDataObject),
						{ itemData: { item: i } },
					);
					responseData.push.apply(responseData, executionData);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					responseData.push({ error: error.message, json: {}, itemIndex: i });
					continue;
				}
				throw error;
			}
		}

		return [responseData];
	}
}
