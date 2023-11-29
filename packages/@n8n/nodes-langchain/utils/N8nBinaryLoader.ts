import type { IExecuteFunctions, INodeExecutionData, IBinaryData } from 'n8n-workflow';
import { NodeOperationError, NodeConnectionType } from 'n8n-workflow';

import type { TextSplitter } from 'langchain/text_splitter';
import type { Document } from 'langchain/document';
import { CSVLoader } from 'langchain/document_loaders/fs/csv';
import { DocxLoader } from 'langchain/document_loaders/fs/docx';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { N8nEPubLoader } from './EpubLoader';
import { getMetadataFiltersValues } from './helpers';

const SUPPORTED_MIME_TYPES = {
	auto: ['*/*'],
	pdfLoader: ['application/pdf'],
	csvLoader: ['text/csv'],
	epubLoader: ['application/epub+zip'],
	docxLoader: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
	textLoader: ['text/plain', 'text/mdx', 'text/md'],
	jsonLoader: ['application/json'],
};

export class N8nBinaryLoader {
	private context: IExecuteFunctions;

	private optionsPrefix: string;

	constructor(context: IExecuteFunctions, optionsPrefix = '') {
		this.context = context;
		this.optionsPrefix = optionsPrefix;
	}

	async processAll(items?: INodeExecutionData[]): Promise<Document[]> {
		const docs: Document[] = [];

		if (!items) return [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const processedDocuments = await this.processItem(items[itemIndex], itemIndex);

			docs.push(...processedDocuments);
		}

		return docs;
	}

	async processItem(item: INodeExecutionData, itemIndex: number): Promise<Document[]> {
		const selectedLoader: keyof typeof SUPPORTED_MIME_TYPES = this.context.getNodeParameter(
			'loader',
			itemIndex,
		) as keyof typeof SUPPORTED_MIME_TYPES;

		const binaryDataKey = this.context.getNodeParameter('binaryDataKey', itemIndex) as string;
		const docs: Document[] = [];
		const metadata = getMetadataFiltersValues(this.context, itemIndex);

		if (!item) return [];

		// TODO: Should we support traversing the object to find the binary data?
		const binaryData = item.binary?.[binaryDataKey] as IBinaryData;

		if (!binaryData) {
			throw new NodeOperationError(this.context.getNode(), 'No binary data set.');
		}

		const { mimeType } = binaryData;

		// Check if loader matches the mime-type of the data
		if (selectedLoader !== 'auto' && !SUPPORTED_MIME_TYPES[selectedLoader].includes(mimeType)) {
			const neededLoader = Object.keys(SUPPORTED_MIME_TYPES).find((loader) =>
				SUPPORTED_MIME_TYPES[loader as keyof typeof SUPPORTED_MIME_TYPES].includes(mimeType),
			);

			throw new NodeOperationError(
				this.context.getNode(),
				`Mime type doesn't match selected loader. Please select under "Loader Type": ${neededLoader}`,
			);
		}

		if (!Object.values(SUPPORTED_MIME_TYPES).flat().includes(mimeType)) {
			throw new NodeOperationError(this.context.getNode(), `Unsupported mime type: ${mimeType}`);
		}
		if (
			!SUPPORTED_MIME_TYPES[selectedLoader].includes(mimeType) &&
			selectedLoader !== 'textLoader' &&
			selectedLoader !== 'auto'
		) {
			throw new NodeOperationError(
				this.context.getNode(),
				`Unsupported mime type: ${mimeType} for selected loader: ${selectedLoader}`,
			);
		}

		const bufferData = await this.context.helpers.getBinaryDataBuffer(itemIndex, binaryDataKey);
		const itemBlob = new Blob([new Uint8Array(bufferData)], { type: mimeType });

		let loader: PDFLoader | CSVLoader | N8nEPubLoader | DocxLoader | TextLoader | JSONLoader;
		switch (mimeType) {
			case 'application/pdf':
				const splitPages = this.context.getNodeParameter(
					`${this.optionsPrefix}splitPages`,
					itemIndex,
					false,
				) as boolean;
				loader = new PDFLoader(itemBlob, {
					splitPages,
				});
				break;
			case 'text/csv':
				const column = this.context.getNodeParameter(
					`${this.optionsPrefix}column`,
					itemIndex,
					null,
				) as string;
				const separator = this.context.getNodeParameter(
					`${this.optionsPrefix}separator`,
					itemIndex,
					',',
				) as string;

				loader = new CSVLoader(itemBlob, {
					column: column ?? undefined,
					separator,
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
				const pointers = this.context.getNodeParameter(
					`${this.optionsPrefix}pointers`,
					itemIndex,
					'',
				) as string;
				const pointersArray = pointers.split(',').map((pointer) => pointer.trim());
				loader = new JSONLoader(itemBlob, pointersArray);
				break;
			default:
				loader = new TextLoader(itemBlob);
		}

		const textSplitter = (await this.context.getInputConnectionData(
			NodeConnectionType.AiTextSplitter,
			0,
		)) as TextSplitter | undefined;

		const loadedDoc = textSplitter ? await loader.loadAndSplit(textSplitter) : await loader.load();

		docs.push(...loadedDoc);

		if (metadata) {
			docs.forEach((document) => {
				document.metadata = {
					...document.metadata,
					...metadata,
				};
			});
		}
		return docs;
	}
}
