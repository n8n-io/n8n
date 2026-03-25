import {
	RecommendationCategory,
	type RecommendationCategoryType,
	type NodeRecommendationDocument,
} from '@/types';

import { audioGenerationRecommendation } from './audio-generation';
import { imageGenerationRecommendation } from './image-generation';
import { textManipulationRecommendation } from './text-manipulation';
import { videoGenerationRecommendation } from './video-generation';

export { formatRecommendation } from './utils/format-recommendation';

export const recommendations: Record<
	RecommendationCategoryType,
	NodeRecommendationDocument | undefined
> = {
	[RecommendationCategory.TEXT_MANIPULATION]: textManipulationRecommendation,
	[RecommendationCategory.IMAGE_GENERATION]: imageGenerationRecommendation,
	[RecommendationCategory.VIDEO_GENERATION]: videoGenerationRecommendation,
	[RecommendationCategory.AUDIO_GENERATION]: audioGenerationRecommendation,
};
