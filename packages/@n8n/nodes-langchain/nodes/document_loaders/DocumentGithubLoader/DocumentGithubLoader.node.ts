import { GithubRepoLoader } from '@langchain/community/document_loaders/web/github';
import type { TextSplitter } from '@langchain/textsplitters';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import {
	NodeConnectionTypes,
	type INodeType,
	type INodeTypeDescription,
	type ISupplyDataFunctions,
	type SupplyData,
	type IDataObject,
	type INodeInputConfiguration,
} from 'n8n-workflow';

import { logWrapper } from '@utils/logWrapper';
import { getConnectionHintNoticeField } from '@utils/sharedFields';

function getInputs(parameters: IDataObject) {
	const inputs: INodeInputConfiguration[] = [];

	const textSplittingMode = parameters?.textSplittingMode;
	// If text splitting mode is 'custom' or does not exist (v1), we need to add an input for the text splitter
	if (!textSplittingMode || textSplittingMode === 'custom') {
		inputs.push({
			displayName: 'Text Splitter',
			maxConnections: 1,
			type: 'ai_textSplitter',
			required: true,
		});
	}

	return inputs;
}

export class DocumentGithubLoader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GitHub Document Loader',
		name: 'documentGithubLoader',
		icon: 'file:github.svg',
		group: ['transform'],
		version: [1, 1.1],
		defaultVersion: 1.1,
		description: 'Use GitHub data as input to this chain',
		defaults: {
			name: 'GitHub Document Loader',
		},
		codex: {
			categories: ['AI'],
			subcategories: {
				AI: ['Document Loaders'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.documentgithubloader/',
					},
				],
			},
		},
		credentials: [
			{
				name: 'githubApi',
				required: true,
			},
		],

		inputs: `={{ ((parameter) => { ${getInputs.toString()}; return getInputs(parameter) })($parameter) }}`,
		inputNames: ['Text Splitter'],

		outputs: [NodeConnectionTypes.AiDocument],
		outputNames: ['Document'],
		properties: [
			getConnectionHintNoticeField([NodeConnectionTypes.AiVectorStore]),
			{
				displayName: 'Repository Link',
				name: 'repository',
				type: 'string',
				default: '',
			},
			{
				displayName: 'Branch',
				name: 'branch',
				type: 'string',
				default: 'main',
			},
			{
				displayName: 'Text Splitting',
				name: 'textSplittingMode',
				type: 'options',
				default: 'simple',
				required: true,
				noDataExpression: true,
				displayOptions: {
					show: {
						'@version': [1.1],
					},
				},
				options: [
					{
						name: 'Simple',
						value: 'simple',
						description: 'Splits every 1000 characters with a 200 character overlap',
					},
					{
						name: 'Custom',
						value: 'custom',
						description: 'Connect a custom text-splitting sub-node',
					},
				],
			},
			{
				displayName: 'Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},

				options: [
					{
						displayName: 'Recursive',
						name: 'recursive',
						type: 'boolean',
						default: false,
					},
					{
						displayName: 'Ignore Paths',
						name: 'ignorePaths',
						type: 'string',
						description: 'Comma-separated list of paths to ignore, e.g. "docs, src/tests',
						default: '',
					},
				],
			},
		],
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		this.logger.debug('Supplying data for Github Document Loader');
		const node = this.getNode();

		const repository = this.getNodeParameter('repository', itemIndex) as string;
		const branch = this.getNodeParameter('branch', itemIndex) as string;
		const credentials = await this.getCredentials('githubApi');
		const { ignorePaths, recursive } = this.getNodeParameter('additionalOptions', 0) as {
			recursive: boolean;
			ignorePaths: string;
		};
		let textSplitter: TextSplitter | undefined;

		if (node.typeVersion === 1.1) {
			const textSplittingMode = this.getNodeParameter('textSplittingMode', itemIndex, 'simple') as
				| 'simple'
				| 'custom';

			if (textSplittingMode === 'simple') {
				textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 200 });
			} else if (textSplittingMode === 'custom') {
				textSplitter = (await this.getInputConnectionData(NodeConnectionTypes.AiTextSplitter, 0)) as
					| TextSplitter
					| undefined;
			}
		} else {
			textSplitter = (await this.getInputConnectionData(NodeConnectionTypes.AiTextSplitter, 0)) as
				| TextSplitter
				| undefined;
		}

		const { index } = this.addInputData(NodeConnectionTypes.AiDocument, [
			[{ json: { repository, branch, ignorePaths, recursive } }],
		]);
		const docs = new GithubRepoLoader(repository, {
			branch,
			ignorePaths: (ignorePaths ?? '').split(',').map((p) => p.trim()),
			recursive,
			accessToken: (credentials.accessToken as string) || '',
			apiUrl: credentials.server as string,
		});

		const loadedDocs = textSplitter
			? await textSplitter.splitDocuments(await docs.load())
			: await docs.load();

		this.addOutputData(NodeConnectionTypes.AiDocument, index, [[{ json: { loadedDocs } }]]);
		return {
			response: logWrapper(loadedDocs, this),
		};
	}
}
