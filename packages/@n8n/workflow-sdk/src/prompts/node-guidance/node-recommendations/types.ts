import type { NodeConnectionType } from 'n8n-workflow';

export const RecommendationCategory = {
	TEXT_MANIPULATION: 'text_manipulation',
	IMAGE_GENERATION: 'image_generation',
	VIDEO_GENERATION: 'video_generation',
	AUDIO_GENERATION: 'audio_generation',
} as const;

export type RecommendationCategoryType =
	(typeof RecommendationCategory)[keyof typeof RecommendationCategory];

export const RecommendationCategoryDescription: Record<RecommendationCategoryType, string> = {
	[RecommendationCategory.TEXT_MANIPULATION]:
		'AI text tasks: summarization, analysis, extraction, classification, chat',
	[RecommendationCategory.IMAGE_GENERATION]: 'AI image tasks: generate, analyze, edit images',
	[RecommendationCategory.VIDEO_GENERATION]: 'AI video tasks: generate video from text/images',
	[RecommendationCategory.AUDIO_GENERATION]:
		'AI audio tasks: generate speech, transcribe, translate audio',
};

export interface ConnectedNodeRecommendation {
	nodeType: string;
	connectionType: NodeConnectionType;
	description?: string;
}

export interface NodeRecommendation {
	defaultNode: string;
	operations: string[];
	reasoning: string;
	connectedNodes?: ConnectedNodeRecommendation[];
	note?: string;
}

export interface NodeRecommendationDocument {
	readonly category: RecommendationCategoryType;
	readonly version: string;
	readonly recommendation: NodeRecommendation;
}
