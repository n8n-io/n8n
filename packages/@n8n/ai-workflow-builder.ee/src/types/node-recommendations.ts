import type { NodeConnectionType } from 'n8n-workflow';

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

/**
 * A recommended node to connect to the default node
 */
export interface ConnectedNodeRecommendation {
	/** The n8n node type to connect (e.g., "@n8n/n8n-nodes-langchain.lmChatOpenAi") */
	nodeType: string;
	/** The connection type */
	connectionType: NodeConnectionType;
	/** Brief description of why this connection is recommended */
	description?: string;
}

/**
 * Core recommendation data structure
 * Used as input to generate formatted recommendation output
 */
export interface NodeRecommendation {
	/** The default node to use (e.g., "@n8n/n8n-nodes-langchain.agent") */
	defaultNode: string;

	/** List of operations/capabilities this node provides */
	operations: string[];

	/** Explanation of why this is the recommended default */
	reasoning: string;

	/** Optional list of nodes to connect to the default node */
	connectedNodes?: ConnectedNodeRecommendation[];

	/** Optional additional notes or warnings */
	note?: string;
}

/**
 * Interface for node recommendation documentation for a specific category
 */
export interface NodeRecommendationDocument {
	/** The recommendation category this documentation covers */
	readonly category: RecommendationCategoryType;

	/** Version of the documentation */
	readonly version: string;

	/** The recommendation data */
	readonly recommendation: NodeRecommendation;
}
