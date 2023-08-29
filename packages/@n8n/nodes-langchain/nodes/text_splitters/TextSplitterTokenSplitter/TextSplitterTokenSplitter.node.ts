/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { TokenTextSplitter } from 'langchain/text_splitter';
import { logWrapper } from '../../../utils/logWrapper';

export class TextSplitterTokenSplitter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Token Splitter',
		name: 'textSplitterTokenSplitter',
		icon: 'fa:remove-format',
		group: ['transform'],
		version: 1,
		description: 'Split text into chunks by tokens',
		defaults: {
			name: 'Token Splitter',
			color: '#400080',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Text Splitters'],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['textSplitter'],
		outputNames: ['Text Splitter'],
		properties: [
			{
				displayName: 'Chunk Size',
				name: 'chunkSize',
				type: 'number',
				default: 1000,
			},
			{
				displayName: 'Chunk Overlap',
				name: 'chunkOverlap',
				type: 'number',
				default: 0,
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		this.logger.verbose('Supply Data for Text Splitter');
		const itemIndex = 0;

		const chunkSize = this.getNodeParameter('chunkSize', itemIndex) as number;
		const chunkOverlap = this.getNodeParameter('chunkOverlap', itemIndex) as number;

		const splitter = new TokenTextSplitter({
			chunkSize,
			chunkOverlap,
			allowedSpecial: 'all',
			disallowedSpecial: 'all',
			encodingName: 'cl100k_base',
			keepSeparator: false,
			// allowedSpecial: 'all',
			// disallowedSpecial: 'all',
			// encodingName: 'cl100k_base',
		});

		return {
			response: logWrapper(splitter, this),
		};
	}
}
