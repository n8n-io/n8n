import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { AgentV2 } from './V2/AgentV2.node';

export class AgentTool extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'AI Agent Tool',
			name: 'agentTool',
			icon: 'fa:robot',
			iconColor: 'black',
			group: ['transform'],
			description: 'Generates an action plan and executes it. Can use external tools.',
			codex: {
				alias: ['LangChain', 'Chat', 'Conversational', 'Plan and Execute', 'ReAct', 'Tools'],
				categories: ['AI'],
				subcategories: {
					AI: ['Tools'],
					Tools: ['Other Tools'],
				},
				resources: {
					primaryDocumentation: [
						{
							url: 'https://docs.n8n.io/integrations/builtin/cluster-nodes/root-nodes/n8n-nodes-langchain.agent/',
						},
					],
				},
			},
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			2: new AgentV2(baseDescription, true),
		};

		super(nodeVersions, baseDescription);
	}
}
