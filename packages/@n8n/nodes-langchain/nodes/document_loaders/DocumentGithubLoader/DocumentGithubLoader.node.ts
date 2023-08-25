/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { type IExecuteFunctions, type INodeType, type INodeTypeDescription, type SupplyData } from 'n8n-workflow';
import { GithubRepoLoader } from 'langchain/document_loaders/web/github';
import { CharacterTextSplitter } from 'langchain/text_splitter';
import { getAndValidateSupplyInput } from '../../../utils/getAndValidateSupplyInput';
import { logWrapper } from '../../../utils/logWrapper';

export class DocumentGithubLoader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Github Document Loader',
		name: 'documentGithubLoader',
		icon: 'file:github.svg',
		group: ['transform'],
		version: 1,
		description: 'To create a document from Github repo',
		defaults: {
			name: 'LangChain - Github repo to Document',
			// eslint-disable-next-line n8n-nodes-base/node-class-description-non-core-color-present
			color: '#500080',
		},
		credentials: [
			{
				name: 'githubApi',
				required: true,
			}
		],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: ['textSplitter'],
		inputNames: ['Text Splitter'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['document'],
		outputNames: ['Document'],
		properties: [
			{
				displayName: 'Repository Link',
				name: 'repository',
				type: 'string',
				default: '',
			}, {
				displayName: 'Branch',
				name: 'branch',
				type: 'string',
				default: 'main',
			}, {
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
					}, {
						displayName: 'Ignore Paths',
						name: 'recursive',
						type: 'string',
						description: 'Comma separated list of paths to ignore, e.g. "docs, src/tests',
						default: '',
					},
				],
			},
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		console.log('Supplying data for Github Document Loader');

		const repository = this.getNodeParameter('repository', 0) as string;
		const branch = this.getNodeParameter('branch', 0) as string;
		const credentials = await this.getCredentials('githubApi');
		const { ignorePaths, recursive} = this.getNodeParameter('additionalOptions', 0) as { recursive: boolean, ignorePaths: string };
		const textSplitter = await getAndValidateSupplyInput(this, 'textSplitter', false) as CharacterTextSplitter | undefined;

		const docs = new GithubRepoLoader(repository, {
			branch,
			ignorePaths: (ignorePaths ?? '').split(',').map((p) => p.trim()),
			recursive,
			accessToken: credentials.accessToken as string || ''
		});

		const loadedDocs = textSplitter ? await docs.loadAndSplit(textSplitter) : await docs.load()


		return {
			response: logWrapper(loadedDocs, this),
		};
	}
}
