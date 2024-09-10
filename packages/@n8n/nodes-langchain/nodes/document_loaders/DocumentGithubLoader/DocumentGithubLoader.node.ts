/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import {
	NodeConnectionType,
	type IExecuteFunctions,
	type INodeType,
	type INodeTypeDescription,
	type SupplyData,
} from 'n8n-workflow';
import { GithubRepoLoader } from '@langchain/community/document_loaders/web/github';
import type { CharacterTextSplitter } from '@langchain/textsplitters';
import { logWrapper } from '../../../utils/logWrapper';
import { getConnectionHintNoticeField } from '../../../utils/sharedFields';

export class DocumentGithubLoader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'GitHub Document Loader',
		name: 'documentGithubLoader',
		icon: 'file:github.svg',
		group: ['transform'],
		version: 1,
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

	async supplyData(this: IExecuteFunctions, itemIndex: number): Promise<SupplyData> {
		console.log('Supplying data for Github Document Loader');

		const repository = this.getNodeParameter('repository', itemIndex) as string;
		const branch = this.getNodeParameter('branch', itemIndex) as string;
		const credentials = await this.getCredentials('githubApi');
		const { ignorePaths, recursive } = this.getNodeParameter('additionalOptions', 0) as {
			recursive: boolean;
			ignorePaths: string;
		};

		const textSplitter = (await this.getInputConnectionData(
			NodeConnectionType.AiTextSplitter,
			0,
		)) as CharacterTextSplitter | undefined;

		const docs = new GithubRepoLoader(repository, {
			branch,
			ignorePaths: (ignorePaths ?? '').split(',').map((p) => p.trim()),
			recursive,
			accessToken: (credentials.accessToken as string) || '',
		});

		const loadedDocs = textSplitter
			? await textSplitter.splitDocuments(await docs.load())
			: await docs.load();

		return {
			response: logWrapper(loadedDocs, this),
		};
	}
}
