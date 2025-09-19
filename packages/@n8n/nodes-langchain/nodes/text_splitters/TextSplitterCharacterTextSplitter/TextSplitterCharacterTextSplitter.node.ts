import type { CharacterTextSplitterParams } from '@langchain/textsplitters';
import { CharacterTextSplitter } from '@langchain/textsplitters';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

export class TextSplitterCharacterTextSplitter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Character Text Splitter',
		name: 'textSplitterCharacterTextSplitter',
		icon: 'fa:grip-lines-vertical',
		iconColor: 'black',
		group: ['transform'],
		version: 1,
		description: 'Split text into chunks by characters',
		defaults: {
			name: 'Character Text Splitter',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Text Splitters'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.textsplittercharactertextsplitter/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiTextSplitter],
		outputNames: ['Text Splitter'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiDocument]),
			{
				displayName: 'Separator',
				name: 'separator',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Chunk Size',
				name: 'chunkSize',
				type: 'number',
				default: 1000,
				description: 'Maximum number of characters per chunk',
			},
			{
				displayName: 'Chunk Overlap',
				name: 'chunkOverlap',
				type: 'number',
				default: 0,
				description: 'Number of characters shared between consecutive chunks to preserve context',
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supply Data for Text Splitter');

		const separator = this.getNodeParameter('separator', itemIndex) as string;
		const chunkSize = this.getNodeParameter('chunkSize', itemIndex) as number;
		const chunkOverlap = this.getNodeParameter('chunkOverlap', itemIndex) as number;

		const params: CharacterTextSplitterParams = {
			separator,
			chunkSize,
			chunkOverlap,
			keepSeparator: false,
		};

		const splitter = new CharacterTextSplitter(params);

		return {
			response: logWrapper(splitter, this),
		};
	}
}
