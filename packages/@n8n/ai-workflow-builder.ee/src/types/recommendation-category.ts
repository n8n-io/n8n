/**
 * Categories for node recommendations
 * Generic enumeration that can be expanded beyond AI tasks in the future
 */
export const RecommendationCategory = {
	// AI-related categories (initial implementation)
	/** AI text tasks: summarization, analysis, extraction, classification, chat */
	TEXT_MANIPULATION: 'text_manipulation',
	/** AI image tasks: generate, analyze, edit images */
	IMAGE_GENERATION: 'image_generation',
	/** AI video tasks: generate video from text/images */
	VIDEO_GENERATION: 'video_generation',
	/** AI audio tasks: generate speech, transcribe, translate audio */
	AUDIO_GENERATION: 'audio_generation',
} as const;

export type RecommendationCategoryType =
	(typeof RecommendationCategory)[keyof typeof RecommendationCategory];

/**
 * Human-readable descriptions for each recommendation category
 */
export const RecommendationCategoryDescription: Record<RecommendationCategoryType, string> = {
	[RecommendationCategory.TEXT_MANIPULATION]:
		'AI text tasks: summarization, analysis, extraction, classification, chat',
	[RecommendationCategory.IMAGE_GENERATION]: 'AI image tasks: generate, analyze, edit images',
	[RecommendationCategory.VIDEO_GENERATION]: 'AI video tasks: generate video from text/images',
	[RecommendationCategory.AUDIO_GENERATION]:
		'AI audio tasks: generate speech, transcribe, translate audio',
};
