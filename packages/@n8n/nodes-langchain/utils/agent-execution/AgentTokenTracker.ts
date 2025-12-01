import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { LLMResult } from '@langchain/core/outputs';

export type TokenUsageData = {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	isEstimate: boolean;
};

export class AgentTokenTracker extends BaseCallbackHandler {
	name = 'AgentTokenTracker';

	private tokens: TokenUsageData[] = [];

	async handleLLMEnd(output: LLMResult): Promise<void> {
		// Extract token usage from LLMResult
		// Some providers use 'tokenUsage', others use 'estimatedTokenUsage'
		const tokenUsage = (output?.llmOutput?.tokenUsage || output?.llmOutput?.estimatedTokenUsage) as
			| {
					completionTokens?: number;
					promptTokens?: number;
					totalTokens?: number;
			  }
			| undefined;

		if (tokenUsage && tokenUsage.completionTokens && tokenUsage.promptTokens) {
			// Actual token data from API
			const isEstimate = !!output?.llmOutput?.estimatedTokenUsage && !output?.llmOutput?.tokenUsage;
			this.tokens.push({
				promptTokens: tokenUsage.promptTokens,
				completionTokens: tokenUsage.completionTokens,
				totalTokens:
					tokenUsage.totalTokens ?? tokenUsage.promptTokens + tokenUsage.completionTokens,
				isEstimate,
			});
		}
	}

	getAccumulatedTokens(): TokenUsageData {
		if (this.tokens.length === 0) {
			return {
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
				isEstimate: false,
			};
		}

		const aggregated = this.tokens.reduce(
			(acc, curr) => ({
				promptTokens: acc.promptTokens + curr.promptTokens,
				completionTokens: acc.completionTokens + curr.completionTokens,
				totalTokens: acc.totalTokens + curr.totalTokens,
				isEstimate: acc.isEstimate || curr.isEstimate,
			}),
			{ promptTokens: 0, completionTokens: 0, totalTokens: 0, isEstimate: false },
		);

		return aggregated;
	}

	reset(): void {
		this.tokens = [];
	}
}
