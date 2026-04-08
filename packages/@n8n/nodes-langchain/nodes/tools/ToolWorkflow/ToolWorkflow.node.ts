import type { IVersionedNodeType, INodeTypeBaseDescription } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { ToolWorkflowV1 } from './v1/ToolWorkflowV1.node';
import { ToolWorkflowV2 } from './v2/ToolWorkflowV2.node';

export class ToolWorkflow extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Call n8n Sub-Workflow Tool',
			name: 'toolWorkflow',
			icon: 'fa:network-wired',
			iconColor: 'black',
			group: ['transform'],
			description:
				'Uses another n8n workflow as a tool. Allows packaging any n8n node(s) as a tool.',
			codex: {
				categories: ['AI'],
				subcategories: {
					AI: ['Tools'],
					Tools: ['Recommended Tools'],
				},
				resources: {
					primaryDocumentation: [
						{
							url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/sub-nodes/n8n-nodes-langchain.toolworkflow/',
						},
					],
				},
			},
			defaultVersion: 2.2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new ToolWorkflowV1(baseDescription),
			1.1: new ToolWorkflowV1(baseDescription),
			1.2: new ToolWorkflowV1(baseDescription),
			1.3: new ToolWorkflowV1(baseDescription),
			2: new ToolWorkflowV2(baseDescription),
			2.1: new ToolWorkflowV2(baseDescription),
			2.2: new ToolWorkflowV2(baseDescription),
		};
		super(nodeVersions, baseDescription);
	}
}
