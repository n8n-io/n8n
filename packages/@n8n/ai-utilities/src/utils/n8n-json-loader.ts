import { JSONLoader } from '@langchain/classic/document_loaders/fs/json';
import { TextLoader } from '@langchain/classic/document_loaders/fs/text';
import type { Document } from '@langchain/core/documents';
import type { TextSplitter } from '@langchain/textsplitters';
import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type ISupplyDataFunctions,
	NodeOperationError,
} from 'n8n-workflow';

import { getMetadataFiltersValues } from './helpers';

export class N8nJsonLoader {
	constructor(
		private context: IExecuteFunctions | ISupplyDataFunctions,
		private optionsPrefix = '',
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
			console.log(
				`[VM-DEBUG] n8n-json-loader processItem itemIndex=${itemIndex} typeof=${typeof dataString} length=${typeof dataString === 'string' ? dataString.length : 'N/A'} preview=${typeof dataString === 'string' ? dataString.slice(0, 80) : JSON.stringify(dataString)?.slice(0, 80)}`,
			);
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

		const loadedDocs = await documentLoader.load();
		console.log(
			`[VM-DEBUG] n8n-json-loader loaded ${loadedDocs.length} docs, hasTextSplitter=${!!this.textSplitter}, itemIndex=${itemIndex}`,
		);
		const docs = this.textSplitter
			? await this.textSplitter.splitDocuments(loadedDocs)
			: loadedDocs;

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
