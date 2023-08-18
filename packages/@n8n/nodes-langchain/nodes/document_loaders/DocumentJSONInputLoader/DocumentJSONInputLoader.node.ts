/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {  INodeExecutionData, type IExecuteFunctions, type INodeType, type INodeTypeDescription, type SupplyData } from 'n8n-workflow';

import { CharacterTextSplitter } from 'langchain/text_splitter';
import { logWrapper } from '../../../utils/logWrapper';
import { Document } from 'langchain/document';
import { JSONLoader } from 'langchain/document_loaders/fs/json';

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
		inputs: ['main', 'textSplitter'],
		inputNames: ['', 'Text Splitter'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['main', 'document'],
		outputNames: ['', 'Document'],
		properties: [],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		let textSplitter: CharacterTextSplitter | undefined;
		console.log('Supply Data for JSON Input Loader');
		const items = await this.getInputData();
		const textSplitterNode = await this.getInputConnectionData(0, 0, 'textSplitter', this.getNode().name);
		if (textSplitterNode?.[0]?.response) {
			textSplitter = textSplitterNode?.[0]?.response as CharacterTextSplitter;
		}

		const docs: Document[] = [];
		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const itemData = items[itemIndex].json;
			const itemString = JSON.stringify(itemData);

			const itemBlob = new Blob([itemString], { type: 'application/json' })
			// TODO: Implement pointers to extract only parts of JSON
			const jsonDoc = new JSONLoader(itemBlob);
			const loadedDoc = textSplitter
				? await jsonDoc.loadAndSplit(textSplitter)
				: await jsonDoc.load();


			docs.push(...loadedDoc)
		}

		this.addOutputData('document', [[{ json: { document: docs } }]]);

		return {
			response: logWrapper(docs, this),
		};
	}
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData(0);

		// Only pass it through?
		return this.prepareOutputData(items);
	}
}
