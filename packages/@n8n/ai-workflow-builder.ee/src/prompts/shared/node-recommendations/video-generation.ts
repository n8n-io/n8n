import type { NodeRecommendationDocument } from '../../../types/node-recommendations';
import { RecommendationCategory } from '../../../types/recommendation-category';

export const videoGenerationRecommendation: NodeRecommendationDocument = {
	category: RecommendationCategory.VIDEO_GENERATION,
	version: '1.0.0',
	recommendation: {
		defaultNode: '@n8n/n8n-nodes-langchain.openAi',
		operations: ['Generate a Video: Create videos from text prompts using Sora'],
		reasoning:
			"OpenAI Sora is the default for video generation. Prefer OpenAI when user doesn't specify a provider.",
		alternatives: [
			{
				trigger: 'Google or Veo',
				recommendation: 'Use Google Gemini for video generation capabilities',
			},
			{
				trigger: 'Runway or Pika',
				recommendation: 'Use HTTP Request node with the respective API',
			},
		],
		note: 'Video generation may require async processing with Wait nodes due to longer generation times.',
	},
};
