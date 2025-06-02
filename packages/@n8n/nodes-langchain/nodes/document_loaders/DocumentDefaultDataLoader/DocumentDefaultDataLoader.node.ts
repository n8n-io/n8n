import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { DocumentDefaultDataLoaderV1 } from './V1/DocumentDefaultDataLoaderV1.node';
import { DocumentDefaultDataLoaderV2 } from './V2/DocumentDefaultDataLoaderV2.node';

export class DocumentDefaultDataLoader extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Default Data Loader',
			name: 'documentDefaultDataLoader',
			icon: 'file:binary.svg',
			group: ['transform'],
			description: 'Load data from previous step in the workflow',
			codex: {
				categories: ['AI'],
				subcategories: {
					AI: ['Document Loaders'],
				},
				resources: {
					primaryDocumentation: [
						{
							url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.documentdefaultdataloader/',
						},
					],
				},
			},
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new DocumentDefaultDataLoaderV1(baseDescription),
			2: new DocumentDefaultDataLoaderV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
