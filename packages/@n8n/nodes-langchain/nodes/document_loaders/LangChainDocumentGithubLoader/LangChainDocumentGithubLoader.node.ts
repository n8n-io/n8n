/* eslint-disable n8n-nodes-base/node-dirname-against-convention */
import { type IExecuteFunctions, type INodeType, type INodeTypeDescription, type SupplyData } from 'n8n-workflow';
import { GithubRepoLoader } from 'langchain/document_loaders/web/github';
import { CharacterTextSplitter } from 'langchain/text_splitter';

export class LangChainDocumentGithubLoader implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'LangChain - Github Document Loader',
		name: 'langChainDocumentGithubLoader',
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
				displayOptions: {
					show: {
						authentication: ['accessToken'],
					},
				},
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
			}
		],
	};

	async supplyData(this: IExecuteFunctions): Promise<SupplyData> {
		let textSplitter: CharacterTextSplitter | undefined;
		const repository = this.getNodeParameter('repository', 0) as string;
		const branch = this.getNodeParameter('branch', 0) as string;
		const credentials = await this.getCredentials('githubApi');

		const textSplitterNode = await this.getInputConnectionData(0, 0, 'textSplitter', this.getNode().name);
		if (textSplitterNode?.[0]?.response) {
			textSplitter = textSplitterNode?.[0]?.response as CharacterTextSplitter;
		}

		const docs = new GithubRepoLoader(repository, {
			branch,
			accessToken: credentials.accessToken as string || ''
		});
		const loadedDocs = textSplitter ? await docs.loadAndSplit(textSplitter) : await docs.load()


		return {
			response: loadedDocs,
		};
	}
}
