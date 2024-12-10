import type { INodeTypeBaseDescription } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { AgentV1 } from './v1/AgentV1.node';
import { AgentV2 } from './v2/AgentV2.node';

const baseDescription: INodeTypeBaseDescription = {
	displayName: 'AI Agent',
	description: 'Generates an action plan and executes it. Can use external tools.',
	name: 'agent',
	icon: 'fa:robot',
	group: ['transform'],
	codex: {
		alias: ['LangChain', 'Chat', 'Conversational', 'Plan and Execute', 'ReAct', 'Tools'],
		categories: ['AI'],
		subcategories: {
			AI: ['Agents', 'Root Nodes'],
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

export class Agent extends VersionedNodeType {
	constructor() {
		const nodeVersions = {
			1: new AgentV1(baseDescription),
			2: new AgentV2(baseDescription),
		};
		super(nodeVersions, baseDescription);
	}
}
