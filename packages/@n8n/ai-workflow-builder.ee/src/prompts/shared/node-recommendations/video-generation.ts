import {
	type NodeRecommendationDocument,
	RecommendationCategory,
} from '@/types/node-recommendations';

export const videoGenerationRecommendation: NodeRecommendationDocument = {
	category: RecommendationCategory.VIDEO_GENERATION,
	version: '1.0.0',
	recommendation: {
		defaultNode: '@n8n/n8n-nodes-langchain.openAi',
		operations: ['Generate a Video: Create videos from text prompts using Sora'],
		reasoning:
			"OpenAI Sora is the default for video generation. Prefer OpenAI when user doesn't specify a provider.",
		note: 'Video generation may require async processing with Wait nodes due to longer generation times.',
	},
};
