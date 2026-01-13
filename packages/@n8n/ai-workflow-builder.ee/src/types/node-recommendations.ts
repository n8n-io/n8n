import type { RecommendationCategoryType } from './recommendation-category';

/**
 * An alternative provider/approach for the recommendation
 */
export interface RecommendationAlternative {
	/** Trigger phrase that indicates when to use this alternative (e.g., "Anthropic or Claude") */
	trigger: string;
	/** Description of what to use instead */
	recommendation: string;
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

	/** Optional list of alternative providers/approaches */
	alternatives?: RecommendationAlternative[];

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
