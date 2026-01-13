import type { RecommendationCategoryType } from './recommendation-category';

/**
 * Interface for node recommendation documentation for a specific category
 */
export interface NodeRecommendationDocument {
	/** The recommendation category this documentation covers */
	readonly category: RecommendationCategoryType;

	/** Version of the documentation */
	readonly version: string;

	/**
	 * Returns the recommendation as an XML-formatted string
	 */
	getRecommendation(): string;
}
