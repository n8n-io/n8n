/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { INodeExecutionData, type IExecuteFunctions, type INodeType, type INodeTypeDescription, type SupplyData } from 'n8n-workflow';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { getSingleInputConnectionData } from '../../utils/helpers';

export class LangChainDocumentJSONInputLoader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Workflow Input to JSON Document',
		name: 'langChainDocumentJSONInputLoader',
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
		const items = this.getInputData(0);
		const textSplitter = await getSingleInputConnectionData(this, 'textSplitter', 'Text Splitter', 0, 1) as CharacterTextSplitter;


		const stringifiedItems = JSON.stringify(items)
		const itemsBlob = new Blob([stringifiedItems], { type: 'application/json' })

		const jsonDoc = new JSONLoader(itemsBlob);
		const loaded = textSplitter ? await jsonDoc.loadAndSplit(textSplitter) : await jsonDoc.load()


		return {
			response: loaded,
		};
	}
	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData(0);

		// const returnData: INodeExecutionData[] = [];
		// for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
		// 	const text = this.getNodeParameter('text', itemIndex) as string;


		// 	returnData.push({ json: { response } });
		// }
		// Only pass it through?
		return this.prepareOutputData(items);
	}
}
