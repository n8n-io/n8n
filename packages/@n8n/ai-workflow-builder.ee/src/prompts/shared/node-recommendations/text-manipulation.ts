import {
	type NodeRecommendationDocument,
	RecommendationCategory,
} from '@/types/node-recommendations';

export const textManipulationRecommendation: NodeRecommendationDocument = {
	category: RecommendationCategory.TEXT_MANIPULATION,
	version: '1.0.0',
	recommendation: {
		defaultNode: '@n8n/n8n-nodes-langchain.agent',
		operations: [
			'Text summarization',
			'Content analysis and extraction',
			'Classification and categorization',
			'Chat and conversational AI',
			'Content generation and writing',
		],
		reasoning:
			'The AI Agent node is the default for text manipulation tasks. New users receive free OpenAI credits. Do NOT use provider-specific nodes directly.',
		connectedNodes: [
			{
				nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
				connectionType: 'ai_languageModel',
				description: 'Required chat model for the AI Agent',
			},
		],
	},
};
