import {
	NodeOperationError,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

// We gebruiken require omdat pdf-parse geen TypeScript definities heeft
const pdfParse = require('pdf-parse');
export class PdfPageExtract implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PDF Page Extract',
		name: 'pdfPageExtract',
		icon: 'file:pdf.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Extraheert tekst per pagina uit een PDF bestand',
		defaults: {
			name: 'PDF Page Extract',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [NodeConnectionType.Main],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Extract Pages',
						value: 'extractPages',
						description: 'Extract text from PDF as an array of pages',
						action: 'Extract text from PDF as an array of pages',
					},
				],
				default: 'extractPages',
			},
			{
				displayName: 'Binary Property',
				name: 'binaryPropertyName',
				type: 'string',
				default: 'data',
				required: true,
				displayOptions: {
					show: {
						operation: ['extractPages'],
					},
				},
				description: 'Name of the binary property which contains the PDF data',
			},
			{
				displayName: 'Include Raw Text',
				name: 'includeRawText',
				type: 'boolean',
				default: false,
				displayOptions: {
					show: {
						operation: ['extractPages'],
					},
				},
				description: 'Whether to include the complete raw text in addition to the pages array',
			},
			{
				displayName: 'Include Metadata',
				name: 'includeMetadata',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						operation: ['extractPages'],
					},
				},
				description: 'Whether to include PDF metadata in the output',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		if (operation === 'extractPages') {
			for (let i = 0; i < items.length; i++) {
				try {
					const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
					const includeRawText = this.getNodeParameter('includeRawText', i) as boolean;
					const includeMetadata = this.getNodeParameter('includeMetadata', i) as boolean;
					
					if (!items[i].binary) {
						throw new NodeOperationError(this.getNode(), 'No binary data exists on item!');
					}
					
					const binaryData = items[i].binary as Record<string, { data: string; fileName?: string; mimeType?: string }>;
					if (!binaryData[binaryPropertyName]) {
						throw new NodeOperationError(
							this.getNode(),
							`Binary data property "${binaryPropertyName}" does not exist on item!`,
						);
					}

					const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

					if (buffer.length === 0) {
						throw new NodeOperationError(this.getNode(), 'PDF binary data is empty after decoding!');
					}
					
					// Array om pagina's op te slaan
					const pages: string[] = [];
					
					// Opties voor pdf-parse
					const options = {
						// @ts-ignore - pdf-parse types zijn niet beschikbaar
						pagerender: function(pageData: any) {
							const renderOptions = {
								normalizeWhitespace: false,
								disableCombineTextItems: false
							};
							
							return pageData.getTextContent(renderOptions)
								.then(function(textContent: any) {
									let text = '';
									for (const item of textContent.items) {
										text += item.str + ' ';
									}
									pages.push(text.trim());
									return text;
								});
						}
					};

					// @ts-ignore - pdf-parse types zijn niet beschikbaar
					const data = await pdfParse(buffer, options);

					const json: Record<string, any> = {
						filename: binaryData[binaryPropertyName].fileName || 'document.pdf',
						totalPages: data.numpages,
						pages: pages,
					};

					// Voeg optionele velden toe
					if (includeRawText) {
						json.text = data.text;
					}

					if (includeMetadata) {
						json.metadata = data.metadata;
						json.info = data.info;
					}

					const newItem: INodeExecutionData = {
						json,
						binary: items[i].binary,
					};

					returnData.push(newItem);
				} catch (error: any) { // Hier specificeren we dat error van het type 'any' is
					if (this.continueOnFail()) {
						returnData.push({
							json: {
								error: error.message,
							},
							binary: items[i].binary,
						});
						continue;
					}
					throw error;
				}
			}
		}

		return [returnData];
	}
}
