import type { NodeRecommendationDocument } from '@/types/node-recommendations';
import {
	RecommendationCategory,
	type RecommendationCategoryType,
} from '@/types/recommendation-category';

import { AudioGenerationRecommendation } from './audio-generation';
import { ImageGenerationRecommendation } from './image-generation';
import { TextManipulationRecommendation } from './text-manipulation';
import { VideoGenerationRecommendation } from './video-generation';

export const recommendations: Record<
	RecommendationCategoryType,
	NodeRecommendationDocument | undefined
> = {
	[RecommendationCategory.TEXT_MANIPULATION]: new TextManipulationRecommendation(),
	[RecommendationCategory.IMAGE_GENERATION]: new ImageGenerationRecommendation(),
	[RecommendationCategory.VIDEO_GENERATION]: new VideoGenerationRecommendation(),
	[RecommendationCategory.AUDIO_GENERATION]: new AudioGenerationRecommendation(),
};
