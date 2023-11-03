import { type IExecuteFunctions, type INodeExecutionData, NodeConnectionType } from 'n8n-workflow';

import type { CharacterTextSplitter } from 'langchain/text_splitter';
import type { Document } from 'langchain/document';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { getMetadataFiltersValues } from './helpers';

export class N8nJsonLoader {
	private context: IExecuteFunctions;

	constructor(context: IExecuteFunctions) {
		this.context = context;
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
		const pointers = this.context.getNodeParameter('pointers', itemIndex) as string;
		const pointersArray = pointers.split(',').map((pointer) => pointer.trim());

		const textSplitter = (await this.context.getInputConnectionData(
			NodeConnectionType.AiTextSplitter,
			0,
		)) as CharacterTextSplitter | undefined;
		const metadata = getMetadataFiltersValues(this.context, itemIndex) ?? [];

		if (!item) return [];

		const itemString = JSON.stringify(item.json);
		const itemBlob = new Blob([itemString], { type: 'application/json' });
		const jsonDoc = new JSONLoader(itemBlob, pointersArray);
		const docs = textSplitter ? await jsonDoc.loadAndSplit(textSplitter) : await jsonDoc.load();

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
