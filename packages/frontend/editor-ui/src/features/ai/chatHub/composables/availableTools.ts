import { type ChatHubAgentTool } from '@n8n/api-types';
import { type INode, JINA_AI_TOOL_NODE_TYPE, SEAR_XNG_TOOL_NODE_TYPE } from 'n8n-workflow';

export interface ChatHubToolProvider {
	name: string;
	description: string;
	credentialType: string | undefined;
	tools: Array<{
		title?: string;
		node: INode;
	}>;
}

export const AVAILABLE_TOOLS: Record<ChatHubAgentTool, ChatHubToolProvider> = {
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
					id: '23214834-7382-487b-b71b-e9c339fe44aa',
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
					id: '3d3532ea-b47a-457b-a02f-b0dd859d5e28',
					name: 'Search web in Jina AI',
				},
			},
			{
				title: 'Deep Research',
				node: {
					parameters: {
						resource: 'research',
						operation: 'deepResearch',
						researchQuery:
							"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Research_Query', ``, 'string') }}",
						options: {},
						requestOptions: {},
					},
					type: JINA_AI_TOOL_NODE_TYPE,
					typeVersion: 1,
					position: [0, 0],
					id: 'fb5d477f-f9ee-4570-b8da-6d62bfe87d09',
					name: 'Perform deep research in Jina AI',
				},
			},
		],
	},
	[SEAR_XNG_TOOL_NODE_TYPE]: {
		name: 'SearXNG',
		description: 'Use SearXNG to search the web for relevant information.',
		credentialType: 'searXngApi',
		tools: [
			{
				title: 'Web Search',
				node: {
					parameters: {
						options: {
							numResults:
								"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Number_of_Results', ``, 'number') }}",
							pageNumber:
								"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Search_Page_Number', ``, 'number') }}",
							language:
								"={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('Language', ``, 'string') }}",
						},
					},
					type: SEAR_XNG_TOOL_NODE_TYPE,
					typeVersion: 1,
					position: [0, 0],
					id: '58904ab3-5114-49e5-a2cd-1e8aaa200fb1',
					name: 'Search web in SearXNG',
				},
			},
		],
	},
};
