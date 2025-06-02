import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { DocumentGithubLoaderV1 } from './V1/DocumentGithubLoaderV1.node';
import { DocumentGithubLoaderV2 } from './V2/DocumentGithubLoaderV2.node';

export class DocumentGithubLoader extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'GitHub Loader',
			name: 'documentGithubLoader',
			icon: 'file:github.svg',
			group: ['transform'],
			description: 'Load documents from a GitHub repository',
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
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new DocumentGithubLoaderV1(baseDescription),
			2: new DocumentGithubLoaderV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
