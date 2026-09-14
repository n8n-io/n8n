/**
 * Re-export node recommendations from the shared @n8n/workflow-sdk/prompts package.
 */
import {
	RecommendationCategory,
	type RecommendationCategoryType,
	type NodeRecommendationDocument,
	textManipulationRecommendation,
	imageGenerationRecommendation,
	videoGenerationRecommendation,
	audioGenerationRecommendation,
	formatRecommendation,
} from '@n8n/workflow-sdk/prompts/node-guidance/node-recommendations';

export { formatRecommendation };

export const recommendations: Record<
	RecommendationCategoryType,
	NodeRecommendationDocument | undefined
> = {
	[RecommendationCategory.TEXT_MANIPULATION]: textManipulationRecommendation,
	[RecommendationCategory.IMAGE_GENERATION]: imageGenerationRecommendation,
	[RecommendationCategory.VIDEO_GENERATION]: videoGenerationRecommendation,
	[RecommendationCategory.AUDIO_GENERATION]: audioGenerationRecommendation,
};
