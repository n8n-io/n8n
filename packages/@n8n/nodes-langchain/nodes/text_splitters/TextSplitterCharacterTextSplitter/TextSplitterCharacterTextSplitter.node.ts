/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import type { IExecuteFunctions, INodeType, INodeTypeDescription, SupplyData } from 'n8n-workflow';
import { CharacterTextSplitter, CharacterTextSplitterParams } from 'langchain/text_splitter'
import { logWrapper } from '../../../utils/logWrapper';

export class TextSplitterCharacterTextSplitter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Character Text Splitter',
		name: 'textSplitterCharacterTextSplitter',
		// TODO: Real scissors icon
		icon: 'fa:hand-scissors',
		group: ['transform'],
		version: 1,
		description: 'Character Text Splitter',
		defaults: {
			name: 'LangChain - Character Text Splitter',
			color: '#400080',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['textSplitter'],
		outputNames: ['Text Splitter'],
		properties: [
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
					default: -1,
			}
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		console.log('Supply Data for Text Splitter');
		const itemIndex = 0;
		const separator = this.getNodeParameter('separator', itemIndex) as string;
		const chunkSize = this.getNodeParameter('chunkSize', itemIndex) as number;
		const chunkOverlap = this.getNodeParameter('chunkOverlap', itemIndex) as number;

		const params: CharacterTextSplitterParams = {
			separator,
			chunkSize,
			chunkOverlap,
			keepSeparator: false
		}

		const splitter = new CharacterTextSplitter(params);

		return {
			response: logWrapper(splitter, this)
		};
	}
}
