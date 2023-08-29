/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData, INodeExecutionData } from 'n8n-workflow';

import { CharacterTextSplitter } from 'langchain/text_splitter';
import { logWrapper } from '../../../utils/logWrapper';
import { Document } from 'langchain/document';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { getAndValidateSupplyInput } from '../../../utils/getAndValidateSupplyInput';

export class N8nJsonLoader {
	private context: IExecuteFunctions;

  constructor(context: IExecuteFunctions) {
		this.context = context;
  }

  async process(items?: INodeExecutionData[]): Promise<Document[]> {
		const pointers = this.context.getNodeParameter('pointers', 0) as string;
		const pointersArray = pointers.split(',').map((pointer) => pointer.trim());
		const textSplitter = await getAndValidateSupplyInput(this.context, 'textSplitter') as CharacterTextSplitter | undefined;

		const docs: Document[] = [];

		if(!items) return docs;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
      const itemData = items[itemIndex].json;
      const itemString = JSON.stringify(itemData);

      const itemBlob = new Blob([itemString], { type: 'application/json' })
      const jsonDoc = new JSONLoader(itemBlob, pointersArray);
      const loadedDoc = textSplitter
        ? await jsonDoc.loadAndSplit(textSplitter)
        : await jsonDoc.load();

      docs.push(...loadedDoc)
    }
    return docs;
  }
}


export class DocumentJSONInputLoader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Workflow Input to JSON Document',
		name: 'documentJSONInputLoader',
		icon: 'file:json.svg',
		group: ['transform'],
		version: 1,
		description: 'To create a document from input',
		defaults: {
			name: 'LangChain - Input to Document',
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
				displayName: 'Pointers',
				name: 'pointers',
				type: 'string',
				default: '',
				description: 'Pointers to extract from JSON, e.g. "/text" or "/text, /meta/title"',
			}
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		this.logger.verbose('Supply Data for JSON Input Loader');
		const processor = new N8nJsonLoader(this);

		return {
			response: logWrapper(processor, this),
		};
	}
}
