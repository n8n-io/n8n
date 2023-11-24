/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';
import { RecursiveUrlLoader } from 'langchain/document_loaders/web/recursive_url';
import type { CharacterTextSplitter } from 'langchain/text_splitter';
import { compile } from 'html-to-text';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class DocumentRecursiveUrlLoader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Recursive Url Document Loader',
		name: 'documentRecursiveUrlLoader',
		icon: 'file:binary.svg',
		group: ['transform'],
		version: 1,
		description:
			'When loading content from a website, we may want to process load all URLs on a page',
		defaults: {
			name: 'Recursive Url Document Loader',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Document Loaders'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.documentrecursiveurlloader/',
					},
				],
			},
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [
			{
				displayName: 'Text Splitter',
				maxConnections: 1,
				type: NodeConnectionType.AiTextSplitter,
			},
		],
		inputNames: ['Text Splitter'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: [NodeConnectionType.AiDocument],
		outputNames: ['Document'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionType.AiVectorStore]),
			{
				displayName: 'First URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'The URL to load documents from',
				required: true,
			},
			{
				displayName: 'Max Depth',
				name: 'maxDepth',
				type: 'number',
				default: 5,
				description: 'The maximum depth for recursive loading',
			},
			{
				displayName: 'Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},

				options: [
					{
						displayName: 'Exclude Directories',
						name: 'excludeDirs',
						type: 'string',
						default: '',
						description: 'Directories to exclude, separated by commas',
					},
					{
						displayName: 'Word Wrap',
						name: 'wordwrap',
						type: 'number',
						default: 130,
					},
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		console.log('Supplying data for Recursive Url Document Loader');

		const url = this.getNodeParameter('url', itemIndex) as string;
		const maxDepth = this.getNodeParameter('maxDepth', itemIndex) as number;

		const { excludeDirs, wordwrap } = this.getNodeParameter('additionalOptions', 0) as {
			excludeDirs: string;
			wordwrap: number;
		};

		const textSplitter = (await this.getInputConnectionData(
			NodeConnectionType.AiTextSplitter,
			0,
		)) as CharacterTextSplitter | undefined;

		const compiledConvert = compile({ wordwrap });

		const docs = new RecursiveUrlLoader(url, {
			maxDepth,
			extractor: compiledConvert,
			excludeDirs: excludeDirs?.split(',').map((dir) => dir.trim()),
		});

		const loadedDocs = textSplitter ? await docs.loadAndSplit(textSplitter) : await docs.load();

		return {
			response: logWrapper(loadedDocs, this),
		};
	}
}
