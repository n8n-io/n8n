export interface LlmTokenUsageData {
	completionTokens: number;
	promptTokens: number;
	totalTokens: number;
	isEstimate: boolean;
}
