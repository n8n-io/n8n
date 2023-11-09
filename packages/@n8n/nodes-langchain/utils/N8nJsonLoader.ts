import {
	type IExecuteFunctions,
	type INodeExecutionData,
	NodeConnectionType,
	NodeOperationError,
} from 'n8n-workflow';

import type { CharacterTextSplitter } from 'langchain/text_splitter';
import type { Document } from 'langchain/document';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { getMetadataFiltersValues } from './helpers';

export class N8nJsonLoader {
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
		const mode = this.context.getNodeParameter('jsonMode', itemIndex, 'allInputData') as
			| 'allInputData'
			| 'expressionData';

		const pointers = this.context.getNodeParameter(
			`${this.optionsPrefix}pointers`,
			itemIndex,
			'',
		) as string;
		const pointersArray = pointers.split(',').map((pointer) => pointer.trim());

		const textSplitter = (await this.context.getInputConnectionData(
			NodeConnectionType.AiTextSplitter,
			0,
		)) as CharacterTextSplitter | undefined;
		const metadata = getMetadataFiltersValues(this.context, itemIndex) ?? [];

		if (!item) return [];

		let documentLoader: JSONLoader | TextLoader | null = null;

		if (mode === 'allInputData') {
			const itemString = JSON.stringify(item.json);
			const itemBlob = new Blob([itemString], { type: 'application/json' });
			documentLoader = new JSONLoader(itemBlob, pointersArray);
		}

		if (mode === 'expressionData') {
			const dataString = this.context.getNodeParameter('jsonData', itemIndex) as string | object;
			if (typeof dataString === 'object') {
				const itemBlob = new Blob([JSON.stringify(dataString)], { type: 'application/json' });
				documentLoader = new JSONLoader(itemBlob, pointersArray);
			}

			if (typeof dataString === 'string') {
				const itemBlob = new Blob([dataString], { type: 'text/plain' });
				documentLoader = new TextLoader(itemBlob);
			}
		}

		if (documentLoader === null) {
			// This should never happen
			throw new NodeOperationError(this.context.getNode(), 'Document loader is not initialized');
		}

		const docs = textSplitter
			? await documentLoader.loadAndSplit(textSplitter)
			: await documentLoader.load();

		if (metadata) {
			docs.forEach((doc) => {
				doc.metadata = {
					...doc.metadata,
					...metadata,
				};
			});
		}
		return docs;
	}
}
