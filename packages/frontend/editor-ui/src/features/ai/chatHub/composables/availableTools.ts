import { type ChatHubAgentTool } from '@n8n/api-types';
import { type INode, JINA_AI_TOOL_NODE_TYPE, SERP_API_TOOL_NODE_TYPE } from 'n8n-workflow';
import { v4 as uuidv4 } from 'uuid';

export interface ChatHubToolProvider {
	name: string;
	description: string;
	credentialType: string | undefined;
	tools: Array<{
		title?: string;
		node: INode;
	}>;
}

// NOTE: Selected tools are matched by their node type (tool provider) and node name combination.
// If you change the name of an existing tool, users who have used that tool befor will need
// to re-select it at their current sessions. This won't affecet custom builder agents,
// the tools defined on them are always used as-is.
export const AVAILABLE_TOOLS: Record<ChatHubAgentTool, ChatHubToolProvider> = {
	[SERP_API_TOOL_NODE_TYPE]: {
		name: 'SerpApi',
		description: 'Use SerpApi to search the web for relevant information.',
		credentialType: 'serpApi',
		tools: [
			{
				title: 'Google Search',
				node: {
					parameters: {
						options: {},
					},
					type: SERP_API_TOOL_NODE_TYPE,
					typeVersion: 1,
					position: [0, 0],
					id: uuidv4(),
					name: 'SerpApi Google Search',
				},
			},
		],
	},
	[JINA_AI_TOOL_NODE_TYPE]: {
		name: 'Jina AI',
		description: 'Use Jina AI to search the web for relevant information.',
		credentialType: 'jinaAiApi',
		tools: [
			{
				title: 'Access Web',
				node: {
					parameters: {
						resource: 'reader',
						operation: 'read',
						url: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('URL', ``, 'string') }}",
						options: {},
						requestOptions: {},
					},
					type: JINA_AI_TOOL_NODE_TYPE,
					typeVersion: 1,
					position: [0, 0],
					id: uuidv4(),
					name: 'Read URL content in Jina AI',
				},
			},
			{
				title: 'Web Search',
				node: {
					parameters: {
						resource: 'reader',
						operation: 'search',
						searchQuery:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Search_Query', ``, 'string') }}",
						simplify:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Simplify', ``, 'boolean') }}",
						options: {},
						requestOptions: {},
					},
					type: JINA_AI_TOOL_NODE_TYPE,
					typeVersion: 1,
					position: [0, 0],
					id: uuidv4(),
					name: 'Search web in Jina AI',
				},
			},
		],
	},
};
