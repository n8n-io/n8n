/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';
import type { CharacterTextSplitterParams } from 'langchain/text_splitter';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class TextSplitterCharacterTextSplitter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Character Text Splitter',
		name: 'textSplitterCharacterTextSplitter',
		icon: 'fa:grip-lines-vertical',
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
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiTextSplitter],
		outputNames: ['Text Splitter'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiDocument]),
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
			},
			{
				displayName: 'Chunk Overlap',
				name: 'chunkOverlap',
				type: 'number',
				default: 0,
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.verbose('Supply Data for Text Splitter');

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
