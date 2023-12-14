/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';
import { ItemListOutputParser } from './ItemListOutputParser';

export class OutputParserItemList implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Item List Output Parser',
		name: 'outputParserItemList',
		icon: 'fa:bars',
		group: ['transform'],
		version: 1,
		description: 'Return the results as separate items',
		defaults: {
			name: 'Item List Output Parser',
		},

		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Output Parsers'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.outputparseritemlist/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiOutputParser],
		outputNames: ['Output Parser'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiChain, NodeConnectionType.AiAgent]),
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Number Of Items',
						name: 'numberOfItems',
						type: 'number',
						default: -1,
						description:
							'Defines how many items should be returned maximally. If set to -1, there is no limit.',
					},
					// For that to be easily possible the metadata would have to be returned and be able to be read.
					// Would also be possible with a wrapper but that would be even more hacky and the output types
					// would not be correct anymore.
					// {
					// 	displayName: 'Parse Output',
					// 	name: 'parseOutput',
					// 	type: 'boolean',
					// 	default: true,
					// 	description: 'Whether the output should be automatically be parsed or left RAW',
					// },
					{
						displayName: 'Separator',
						name: 'separator',
						type: 'string',
						default: '\\n',
						description:
							'Defines the separator that should be used to split the results into separate items. Defaults to a new line but can be changed depending on the data that should be returned.',
					},
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		const options = this.getNodeParameter('options', itemIndex, {}) as {
			numberOfItems?: number;
			separator?: string;
		};

		const parser = new ItemListOutputParser(options);

		return {
			response: logWrapper(parser, this),
		};
	}
}
