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
						{
							name: 'Return Brand Context',
							value: 'context',
							description:
								'Get a structured, narrative-rich brand profile (identity, positioning, voice and visual style) for a domain, suitable for grounding LLMs and generating on-brand content',
							action: "Return a brand's context",
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
					displayOptions: {
						show: {
							operation: ['logo', 'colors', 'data'],
						},
					},
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
					displayOptions: {
						show: {
							operation: ['colors', 'data', 'logo'],
						},
					},
				},
				{
					displayName: 'Domain',
					name: 'domain',
					type: 'string',
					default: '',
					placeholder: 'e.g. apple.com',
					description: 'The domain name of the brand to get context for',
					required: true,
					displayOptions: {
						show: {
							operation: ['context'],
						},
					},
				},
				{
					displayName: 'Output Format',
					name: 'outputFormat',
					type: 'options',
					default: 'json',
					description: 'The format the brand context is returned in',
					displayOptions: {
						show: {
							operation: ['context'],
						},
					},
					options: [
						{
							name: 'JSON',
							value: 'json',
							description:
								'Structured JSON object with identity, positioning, and brand voice and style',
						},
						{
							name: 'Markdown',
							value: 'markdown',
							description: 'Markdown document suitable for use directly in LLM prompts',
						},
					],
				},
				{
					displayName: 'Cached Only',
					name: 'cachedOnly',
					type: 'boolean',
					default: false,
					description:
						'Whether to return the brand context only if one is already cached, responding instantly without crawling the domain. Returns an empty item if no cached context exists.',
					displayOptions: {
						show: {
							operation: ['context'],
						},
					},
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
				if (operation === 'context') {
					const domain = (this.getNodeParameter('domain', i) as string).trim();
					const outputFormat = this.getNodeParameter('outputFormat', i) as string;
					const cachedOnly = this.getNodeParameter('cachedOnly', i) as boolean;

					const qs: IDataObject = {};
					if (cachedOnly) {
						qs.cachedOnly = true;
					}

					const requestOptions: IDataObject =
						outputFormat === 'markdown'
							? { json: false, headers: { accept: 'text/markdown' } }
							: { headers: { accept: 'application/json' } };

					const response = await brandfetchApiRequest.call(
						this,
						'GET',
						`/context/${encodeURIComponent(domain)}`,
						{},
						qs,
						undefined,
						requestOptions,
					);

					let contextJson: IDataObject;
					if (response === undefined || response === null || response === '') {
						// 204 No Content: cachedOnly is set and no cached context exists
						contextJson = {};
					} else if (typeof response === 'string') {
						contextJson = { context: response };
					} else {
						contextJson = response as IDataObject;
					}

					const executionData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray(contextJson),
						{ itemData: { item: i } },
					);
					responseData.push.apply(responseData, executionData);
					continue;
				}

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
