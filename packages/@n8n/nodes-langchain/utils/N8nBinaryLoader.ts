import { CSVLoader } from '@langchain/community/document_loaders/fs/csv';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { EPubLoader } from '@langchain/community/document_loaders/fs/epub';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import type { Document } from '@langchain/core/documents';
import type { TextSplitter } from '@langchain/textsplitters';
import { createWriteStream } from 'fs';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import type {
	IBinaryData,
	IExecuteFunctions,
	INodeExecutionData,
	ISupplyDataFunctions,
} from 'n8n-workflow';
import { NodeOperationError, BINARY_ENCODING } from 'n8n-workflow';
import { pipeline } from 'stream/promises';
import { file as tmpFile, type DirectoryResult } from 'tmp-promise';

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
	constructor(
		private context: IExecuteFunctions | ISupplyDataFunctions,
		private optionsPrefix = '',
		private binaryDataKey = '',
		private textSplitter?: TextSplitter,
	) {}

	async processAll(items?: INodeExecutionData[]): Promise<Document[]> {
		const docs: Document[] = [];

		if (!items) return [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const processedDocuments = await this.processItem(items[itemIndex], itemIndex);

			docs.push(...processedDocuments);
		}

		return docs;
	}

	private async validateMimeType(
		mimeType: string,
		selectedLoader: keyof typeof SUPPORTED_MIME_TYPES,
	): Promise<void> {
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
	}

	private async getFilePathOrBlob(
		binaryData: IBinaryData,
		mimeType: string,
	): Promise<string | Blob> {
		if (binaryData.id) {
			const binaryBuffer = await this.context.helpers.binaryToBuffer(
				await this.context.helpers.getBinaryStream(binaryData.id),
			);
			return new Blob([binaryBuffer], {
				type: mimeType,
			});
		} else {
			return new Blob([Buffer.from(binaryData.data, BINARY_ENCODING)], {
				type: mimeType,
			});
		}
	}

	private async getLoader(
		mimeType: string,
		filePathOrBlob: string | Blob,
		itemIndex: number,
	): Promise<PDFLoader | CSVLoader | EPubLoader | DocxLoader | TextLoader | JSONLoader> {
		switch (mimeType) {
			case 'application/pdf':
				const splitPages = this.context.getNodeParameter(
					`${this.optionsPrefix}splitPages`,
					itemIndex,
					false,
				) as boolean;
				return new PDFLoader(filePathOrBlob, { splitPages });
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
				return new CSVLoader(filePathOrBlob, { column: column ?? undefined, separator });
			case 'application/epub+zip':
				// EPubLoader currently does not accept Blobs https://github.com/langchain-ai/langchainjs/issues/1623
				let filePath: string;
				if (filePathOrBlob instanceof Blob) {
					const tmpFileData = await tmpFile({ prefix: 'epub-loader-' });
					const bufferData = await filePathOrBlob.arrayBuffer();
					await pipeline([new Uint8Array(bufferData)], createWriteStream(tmpFileData.path));
					return new EPubLoader(tmpFileData.path);
				} else {
					filePath = filePathOrBlob;
				}
				return new EPubLoader(filePath);
			case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
				return new DocxLoader(filePathOrBlob);
			case 'text/plain':
				return new TextLoader(filePathOrBlob);
			case 'application/json':
				const pointers = this.context.getNodeParameter(
					`${this.optionsPrefix}pointers`,
					itemIndex,
					'',
				) as string;
				const pointersArray = pointers.split(',').map((pointer) => pointer.trim());
				return new JSONLoader(filePathOrBlob, pointersArray);
			default:
				return new TextLoader(filePathOrBlob);
		}
	}

	private async loadDocuments(
		loader: PDFLoader | CSVLoader | EPubLoader | DocxLoader | TextLoader | JSONLoader,
	): Promise<Document[]> {
		return this.textSplitter
			? await this.textSplitter.splitDocuments(await loader.load())
			: await loader.load();
	}

	private async cleanupTmpFileIfNeeded(
		cleanupTmpFile: DirectoryResult['cleanup'] | undefined,
	): Promise<void> {
		if (cleanupTmpFile) {
			await cleanupTmpFile();
		}
	}

	async processItem(item: INodeExecutionData, itemIndex: number): Promise<Document[]> {
		const docs: Document[] = [];
		const binaryMode = this.context.getNodeParameter('binaryMode', itemIndex, 'allInputData');
		if (binaryMode === 'allInputData') {
			const binaryData = this.context.getInputData();

			for (const data of binaryData) {
				if (data.binary) {
					const binaryDataKeys = Object.keys(data.binary);

					for (const fileKey of binaryDataKeys) {
						const processedDocuments = await this.processItemByKey(item, itemIndex, fileKey);
						docs.push(...processedDocuments);
					}
				}
			}
		} else {
			const processedDocuments = await this.processItemByKey(item, itemIndex, this.binaryDataKey);
			docs.push(...processedDocuments);
		}

		return docs;
	}

	async processItemByKey(
		item: INodeExecutionData,
		itemIndex: number,
		binaryKey: string,
	): Promise<Document[]> {
		const selectedLoader: keyof typeof SUPPORTED_MIME_TYPES = this.context.getNodeParameter(
			'loader',
			itemIndex,
			'auto',
		) as keyof typeof SUPPORTED_MIME_TYPES;

		const docs: Document[] = [];
		const metadata = getMetadataFiltersValues(this.context, itemIndex);

		if (!item) return [];

		const binaryData = this.context.helpers.assertBinaryData(itemIndex, binaryKey);
		const { mimeType } = binaryData;

		await this.validateMimeType(mimeType, selectedLoader);

		const filePathOrBlob = await this.getFilePathOrBlob(binaryData, mimeType);
		const cleanupTmpFile: DirectoryResult['cleanup'] | undefined = undefined;
		const loader = await this.getLoader(mimeType, filePathOrBlob, itemIndex);
		const loadedDoc = await this.loadDocuments(loader);

		docs.push(...loadedDoc);

		if (metadata) {
			docs.forEach((document) => {
				document.metadata = {
					...document.metadata,
					...metadata,
				};
			});
		}

		await this.cleanupTmpFileIfNeeded(cleanupTmpFile);

		return docs;
	}
}
