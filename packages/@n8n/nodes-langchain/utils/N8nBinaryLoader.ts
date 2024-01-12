import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError, BINARY_ENCODING } from 'n8n-workflow';

import type { TextSplitter } from 'langchain/text_splitter';
import type { Document } from 'langchain/document';
import { CSVLoader } from 'langchain/document_loaders/fs/csv';
import { DocxLoader } from 'langchain/document_loaders/fs/docx';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { PDFLoader } from 'langchain/document_loaders/fs/pdf';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { EPubLoader } from 'langchain/document_loaders/fs/epub';
import { file as tmpFile, type DirectoryResult } from 'tmp-promise';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

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

	private binaryDataKey: string;

	private textSplitter?: TextSplitter;

	constructor(context: IExecuteFunctions, optionsPrefix = '', binaryDataKey = '', textSplitter?: TextSplitter) {
		this.context = context;
		this.textSplitter = textSplitter;
		this.optionsPrefix = optionsPrefix;
		this.binaryDataKey = binaryDataKey;
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
			'auto',
		) as keyof typeof SUPPORTED_MIME_TYPES;

		const docs: Document[] = [];
		const metadata = getMetadataFiltersValues(this.context, itemIndex);

		if (!item) return [];

		const binaryData = this.context.helpers.assertBinaryData(itemIndex, this.binaryDataKey)
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

		let filePathOrBlob: string | Blob;
		if (binaryData.id) {
			filePathOrBlob = this.context.helpers.getBinaryPath(binaryData.id);
		} else {
			filePathOrBlob = new Blob([Buffer.from(binaryData.data, BINARY_ENCODING)], {
				type: mimeType,
			});
		}

		let loader: PDFLoader | CSVLoader | EPubLoader | DocxLoader | TextLoader | JSONLoader;
		let cleanupTmpFile: DirectoryResult['cleanup'] | undefined = undefined;

		switch (mimeType) {
			case 'application/pdf':
				const splitPages = this.context.getNodeParameter(
					`${this.optionsPrefix}splitPages`,
					itemIndex,
					false,
				) as boolean;
				loader = new PDFLoader(filePathOrBlob, {
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

				loader = new CSVLoader(filePathOrBlob, {
					column: column ?? undefined,
					separator,
				});
				break;
			case 'application/epub+zip':
				// EPubLoader currently does not accept Blobs https://github.com/langchain-ai/langchainjs/issues/1623
				let filePath: string;
				if (filePathOrBlob instanceof Blob) {
					const tmpFileData = await tmpFile({ prefix: 'epub-loader-' });
					cleanupTmpFile = tmpFileData.cleanup;
					try {
						const bufferData = await filePathOrBlob.arrayBuffer();
						await pipeline([new Uint8Array(bufferData)], createWriteStream(tmpFileData.path));
						loader = new EPubLoader(tmpFileData.path);
						break;
					} catch (error) {
						await cleanupTmpFile();
						throw new NodeOperationError(this.context.getNode(), error as Error);
					}
				} else {
					filePath = filePathOrBlob;
				}
				loader = new EPubLoader(filePath);
				break;
			case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
				loader = new DocxLoader(filePathOrBlob);
				break;
			case 'text/plain':
				loader = new TextLoader(filePathOrBlob);
				break;
			case 'application/json':
				const pointers = this.context.getNodeParameter(
					`${this.optionsPrefix}pointers`,
					itemIndex,
					'',
				) as string;
				const pointersArray = pointers.split(',').map((pointer) => pointer.trim());
				loader = new JSONLoader(filePathOrBlob, pointersArray);
				break;
			default:
				loader = new TextLoader(filePathOrBlob);
		}


		const loadedDoc = this.textSplitter ? await loader.loadAndSplit(this.textSplitter) : await loader.load();

		docs.push(...loadedDoc);

		if (metadata) {
			docs.forEach((document) => {
				document.metadata = {
					...document.metadata,
					...metadata,
				};
			});
		}

		if (cleanupTmpFile) {
			await cleanupTmpFile();
		}
		return docs;
	}
}
