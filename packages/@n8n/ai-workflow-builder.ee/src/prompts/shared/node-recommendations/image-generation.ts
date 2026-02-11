import {
	type NodeRecommendationDocument,
	RecommendationCategory,
} from '@/types/node-recommendations';

export const imageGenerationRecommendation: NodeRecommendationDocument = {
	category: RecommendationCategory.IMAGE_GENERATION,
	version: '1.0.0',
	recommendation: {
		defaultNode: '@n8n/n8n-nodes-langchain.openAi',
		operations: [
			'Analyze Image: Analyze and describe image content using GPT-4 Vision',
			'Generate an Image: Create images from text prompts using DALL-E',
			'Edit Image: Modify existing images using DALL-E',
		],
		reasoning:
			"OpenAI provides comprehensive image capabilities: DALL-E for generation/editing, GPT-4 Vision for analysis. Prefer OpenAI when user doesn't specify a provider.",
	},
};
