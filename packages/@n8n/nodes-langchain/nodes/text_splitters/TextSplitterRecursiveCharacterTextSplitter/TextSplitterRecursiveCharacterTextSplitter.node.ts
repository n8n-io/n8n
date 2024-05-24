/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';
import type {
	RecursiveCharacterTextSplitterParams,
	SupportedTextSplitterLanguage,
} from '@langchain/textsplitters';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

const supportedLanguages: SupportedTextSplitterLanguage[] = [
	'cpp',
	'go',
	'java',
	'js',
	'php',
	'proto',
	'python',
	'rst',
	'ruby',
	'rust',
	'scala',
	'swift',
	'markdown',
	'latex',
	'html',
];
export class TextSplitterRecursiveCharacterTextSplitter implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Recursive Character Text Splitter',
		name: 'textSplitterRecursiveCharacterTextSplitter',
		icon: 'fa:grip-lines-vertical',
		group: ['transform'],
		version: 1,
		description: 'Split text into chunks by characters recursively, recommended for most use cases',
		defaults: {
			name: 'Recursive Character Text Splitter',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Text Splitters'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.textsplitterrecursivecharactertextsplitter/',
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
			{
				displayName: 'Options',
				name: 'options',
				placeholder: 'Add Option',
				description: 'Additional options to add',
				type: 'collection',
				default: {},
				options: [
					{
						displayName: 'Split Code',
						name: 'splitCode',
						default: 'markdown',
						type: 'options',
						options: supportedLanguages.map((lang) => ({ name: lang, value: lang })),
					},
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.verbose('Supply Data for Text Splitter');

		const chunkSize = this.getNodeParameter('chunkSize', itemIndex) as number;
		const chunkOverlap = this.getNodeParameter('chunkOverlap', itemIndex) as number;
		const splitCode = this.getNodeParameter(
			'options.splitCode',
			itemIndex,
			null,
		) as SupportedTextSplitterLanguage | null;
		const params: RecursiveCharacterTextSplitterParams = {
			// TODO: These are the default values, should we allow the user to change them?
			separators: ['\n\n', '\n', ' ', ''],
			chunkSize,
			chunkOverlap,
			keepSeparator: false,
		};
		let splitter: RecursiveCharacterTextSplitter;

		if (splitCode && supportedLanguages.includes(splitCode)) {
			splitter = RecursiveCharacterTextSplitter.fromLanguage(splitCode, params);
		} else {
			splitter = new RecursiveCharacterTextSplitter(params);
		}

		return {
			response: logWrapper(splitter, this),
		};
	}
}
