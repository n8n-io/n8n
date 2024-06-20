import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { ChainSummarizationV1 } from './V1/ChainSummarizationV1.node';
import { ChainSummarizationV2 } from './V2/ChainSummarizationV2.node';

export class ChainSummarization extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Summarization Chain',
			name: 'chainSummarization',
			icon: 'fa:link',
			group: ['transform'],
			description: 'Transforms text into a concise summary',
			codex: {
				alias: ['LangChain'],
				categories: ['AI'],
				subcategories: {
					AI: ['Chains', 'Root Nodes'],
				},
				resources: {
					primaryDocumentation: [
						{
							url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.chainsummarization/',
						},
					],
				},
			},
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new ChainSummarizationV1(baseDescription),
			2: new ChainSummarizationV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
