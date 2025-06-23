/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

import { TokenTextSplitter } from './TokenTextSplitter';

export class TextSplitterTokenSplitter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Token Splitter',
		name: 'textSplitterTokenSplitter',
		icon: 'fa:grip-lines-vertical',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: 'Split text into chunks by tokens',
		defaults: {
			name: 'Token Splitter',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Text Splitters'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.textsplittertokensplitter/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionTypes.AiTextSplitter],
		outputNames: ['Text Splitter'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiDocument]),
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

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply Data for Text Splitter');

		const chunkSize = this.getNodeParameter('chunkSize', itemIndex) as number;
		const chunkOverlap = this.getNodeParameter('chunkOverlap', itemIndex) as number;

		const splitter = new TokenTextSplitter({
			chunkSize,
			chunkOverlap,
			allowedSpecial: 'all',
			disallowedSpecial: 'all',
			encodingName: 'cl100k_base',
			keepSeparator: false,
		});

		return {
			response: logWrapper(splitter, this),
		};
	}
}
