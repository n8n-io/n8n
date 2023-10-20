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

	async process(items?: INodeExecutionData[]): Promise<Document[]> {
		const pointers = this.context.getNodeParameter('pointers', 0) as string;
		const pointersArray = pointers.split(',').map((pointer) => pointer.trim());

		const textSplitter = (await this.context.getInputConnectionData(
			NodeConnectionType.AiTextSplitter,
			0,
		)) as CharacterTextSplitter | undefined;
		const metadata = getMetadataFiltersValues(this.context, 0) ?? [];
		const docs: Document[] = [];

		if (!items) return docs;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const itemData = items[itemIndex].json;
			const itemString = JSON.stringify(itemData);

			const itemBlob = new Blob([itemString], { type: 'application/json' });
			const jsonDoc = new JSONLoader(itemBlob, pointersArray);
			const loadedDoc = textSplitter
				? await jsonDoc.loadAndSplit(textSplitter)
				: await jsonDoc.load();

			docs.push(...loadedDoc);
		}

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
