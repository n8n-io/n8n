/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData, INodeExecutionData, type IBinaryData, NodeOperationError, BINARY_ENCODING } from 'n8n-workflow';

import { TextSplitter } from 'langchain/text_splitter';
import { logWrapper } from '../../../utils/logWrapper';
import { Document } from 'langchain/document';
// @ts-ignore
import { getAndValidateSupplyInput } from '../../../utils/getAndValidateSupplyInput';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { CSVLoader } from 'langchain/document_loaders/fs/csv';
import { DocxLoader } from 'langchain/document_loaders/fs/docx'
import { JSONLoader } from 'langchain/document_loaders/fs/json';

import { N8nEPubLoader } from './EpubLoader';

const SUPPORTED_MIME_TYPES = {
	pdfLoader: ['application/pdf'],
	csvLoader: ['text/csv'],
	epubLoader: ['application/epub+zip'],
	docxLoader: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
	textLoader: ['text/plain'],
	jsonLoader: ['application/json'],
}

export class N8nBinaryLoader {
	private context: IExecuteFunctions;

  constructor(context: IExecuteFunctions) {
		this.context = context;
  }

  async process(items?: INodeExecutionData[]): Promise<Document[]> {
		const selectedLoader: keyof typeof SUPPORTED_MIME_TYPES = this.context.getNodeParameter('loader', 0) as keyof typeof SUPPORTED_MIME_TYPES;
		const binaryDataKey = this.context.getNodeParameter('binaryDataKey', 0) as string;
		const docs: Document[] = [];

		if(!items) return docs;

    for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			// TODO: Should we support traversing the object to find the binary data?
      const binaryData = items[itemIndex].binary?.[binaryDataKey] as IBinaryData;

			if (!binaryData) {
				throw new NodeOperationError(this.context.getNode(), 'No binary data set.');
			}

			const { data, mimeType } = binaryData;

			if (!Object.values(SUPPORTED_MIME_TYPES).flat().includes(mimeType)) {
				throw new NodeOperationError(this.context.getNode(), `Unsupported mime type: ${mimeType}`);
			}
			if (!SUPPORTED_MIME_TYPES[selectedLoader].includes(mimeType) && selectedLoader !== 'textLoader') {
				throw new NodeOperationError(this.context.getNode(), `Unsupported mime type: ${mimeType} for selected loader: ${selectedLoader}`);
			}

			const bufferData = Buffer.from(data, BINARY_ENCODING).buffer;
      const itemBlob = new Blob([bufferData], { type: mimeType })

			let loader: PDFLoader | CSVLoader | N8nEPubLoader | DocxLoader | TextLoader | JSONLoader;
      switch (mimeType) {
        case 'application/pdf':
					const splitPages = this.context.getNodeParameter('splitPages', 0) as boolean;
          loader = new PDFLoader(itemBlob, {
						splitPages
					});
          break;
        case 'text/csv':
					const column = this.context.getNodeParameter('column', 0) as string;
					const separator = this.context.getNodeParameter('separator', 0) as string;

          loader = new CSVLoader(itemBlob, {
						column,
						separator
					});
          break;
        case 'application/epub+zip':
          loader = new N8nEPubLoader(Buffer.from(bufferData));
          break;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          loader = new DocxLoader(itemBlob);
          break;
        case 'text/plain':
          loader = new TextLoader(itemBlob);
          break;
        case 'application/json':
					const pointers = this.context.getNodeParameter('pointers', 0) as string;
					const pointersArray = pointers.split(',').map((pointer) => pointer.trim());
          loader = new JSONLoader(itemBlob, pointersArray);
          break;
        default:
          throw new NodeOperationError(this.context.getNode(), `Unsupported mime type: ${mimeType}`);
      }

			const textSplitter = await getAndValidateSupplyInput(this.context, 'textSplitter') as TextSplitter | undefined;
      const loadedDoc = textSplitter
        ? await loader.loadAndSplit(textSplitter)
        : await loader.load();

      docs.push(...loadedDoc);
    }
    return docs;
  }
}

export class DocumentBinaryInputLoader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Binary to Document',
		name: 'documentBinaryInputLoader',
		icon: 'file:binary.svg',
		group: ['transform'],
		version: 1,
		description: 'Create a Document from binary data',
		defaults: {
			name: 'LangChain - Binary to Document',
			// eslint-disable-next-line n8n-nodes-base/node-class-description-non-core-color-present
			color: '#500080',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['textSplitter'],
		inputNames: ['Text Splitter'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['document'],
		outputNames: ['Document'],
		properties: [
			{
				displayName: 'Loader Type',
				name: 'loader',
				type: 'options',
				default: 'jsonLoader',
				required: true,
				options: [
					{
						name: 'PDF Loader',
						value: 'pdfLoader',
						description: 'Load PDF documents',
					},
					{
						name: 'CSV Loader',
						value: 'csvLoader',
						description: 'Load CSV files',
					},
					{
						name: 'EPub Loader',
						value: 'epubLoader',
						description: 'Load EPub files',
					},
					{
						name: 'Docx Loader',
						value: 'docxLoader',
						description: 'Load Docx documents',
					},
					{
						name: 'Text Loader',
						value: 'textLoader',
						description: 'Load plain text files',
					},
					{
						name: 'JSON Loader',
						value: 'jsonLoader',
						description: 'Load JSON files',
					}
				],
			},
			{
				displayName: 'Binary data key',
				name: 'binaryDataKey',
				type: 'string',
				default: 'data',
				required: true,
				description: 'Name of the binary property from which to read the file buffer',
			},
			// PDF Only Fields
			{
				name: 'splitPages',
				displayName: 'Split Pages',
				type: 'boolean',
				default: true,
				displayOptions: {
					show: {
						loader: ['pdfLoader'],
					},
				},
			},
			// CSV Only Fields
			{
				name: 'column',
				displayName: 'Column',
				type: 'string',
				default: '',
				description: 'Column to extract from CSV',
				displayOptions: {
					show: {
						loader: ['csvLoader'],
					},
				},
			},
			{
				name: 'separator',
				displayName: 'Separator',
				type: 'string',
				description: 'Separator to use for CSV',
				default: ',',
				displayOptions: {
					show: {
						loader: ['csvLoader'],
					},
				},
			},
			// JSON Only Fields
			{
				name: 'pointers',
				displayName: 'Pointers',
				type: 'string',
				default: '',
				description: 'Pointers to extract from JSON, e.g. "/text" or "/text, /meta/title"',
				displayOptions: {
					show: {
						loader: ['jsonLoader'],
					},
				},
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		this.logger.verbose('Supply Data for Binary Input Loader');
		const processor = new N8nBinaryLoader(this);

		return {
			// @ts-ignore
			response: logWrapper(processor, this),
		};
	}
}
