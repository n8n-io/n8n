import type { RecommendationCategoryType } from './recommendation-category';

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
