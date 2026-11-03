export interface AssistantThreadCreditsResponse {
	/**
	 * The credits that the turns of an Assistant agent thread used, as a decimal.
	 * `null` before the first claim. A display total only: the billing service
	 * keeps the real count.
	 */
	creditsUsed: number | null;
}
