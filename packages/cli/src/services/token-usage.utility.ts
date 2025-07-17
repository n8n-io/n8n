import { IRun } from 'n8n-workflow';
import { LLM_PRICING_INFORMATION } from '@/constants/LLMPricing';

export function getTokensConsumedAndCostIncurred(runData: IRun) {
	// Calculate total tokens consumed from the execution data
	// essentially parsing the runData json object
	let totalTokens = 0;
	let totalCost = 0;
	const resultRunData = runData['data']['resultData']['runData'];

	for (const [, nodeData] of Object.entries(resultRunData)) {
		// if this node is AI Agent
		let size = 0;
		if (nodeData) {
			size = nodeData.length;
		}

		for (let i = 0; i < size; i++) {
			if (nodeData && nodeData[i]?.data?.ai_languageModel) {
				const ai_languageModel = nodeData[i]?.data?.ai_languageModel;
				if (ai_languageModel && ai_languageModel[0]) {
					// Type guard to check if json has the expected response structure
					const jsonData = ai_languageModel[0][0]?.json;
					if (jsonData && typeof jsonData === 'object' && 'response' in jsonData) {
						const response = (jsonData as any).response;
						if (response && typeof response === 'object' && 'generations' in response) {
							// the model info can be in these places
							const model =
								response.generations?.[0]?.[0]?.generationInfo?.model_name ??
								(nodeData?.[0]?.inputOverride?.ai_languageModel?.[0]?.[0]?.json as any)?.options
									?.model_name;

							// calculate the cost.
							let modelUsed: String;
							if (typeof model === 'string' && model.toLowerCase() in LLM_PRICING_INFORMATION) {
								modelUsed = model.toLowerCase();
							} else {
								continue; // if the model cannot be extracted, skip token & cost calculation for now
							}

							// the tokens may be in tokenUsage property or in tokenUsageEstimate property
							const promptTokenUsage =
								(jsonData as any)?.tokenUsage?.promptTokens ??
								(jsonData as any)?.tokenUsageEstimate?.promptTokens;
							const completionTokenUsage =
								(jsonData as any)?.tokenUsage?.completionTokens ??
								(jsonData as any)?.tokenUsageEstimate?.completionTokens;

							// update token usage
							if (
								typeof promptTokenUsage === 'number' &&
								typeof completionTokenUsage === 'number'
							) {
								totalTokens += promptTokenUsage + completionTokenUsage;
							}

							if (promptTokenUsage && completionTokenUsage) {
								const inputCost =
									promptTokenUsage *
									LLM_PRICING_INFORMATION[modelUsed as keyof typeof LLM_PRICING_INFORMATION][
										'Input'
									];
								const outputCost =
									completionTokenUsage *
									LLM_PRICING_INFORMATION[modelUsed as keyof typeof LLM_PRICING_INFORMATION][
										'Output'
									];
								const cost = inputCost + outputCost;
								totalCost += cost;
							}
						}
					}
				}
			}
		}

		// if this is OpenAI default node
		if (nodeData && nodeData[0]?.data?.main?.[0]?.[1]?.json) {
			const jsonData = nodeData[0].data.main[0][1].json;
			const model = jsonData.model;
			const completionTokens = jsonData.completion_tokens;
			const promptTokens = jsonData.prompt_tokens;

			if (
				model &&
				typeof completionTokens === 'number' &&
				typeof promptTokens === 'number' &&
				typeof model === 'string'
			) {
				// check if model exists in pricing information
				const modelKey = model.toLowerCase();
				if (!(modelKey in LLM_PRICING_INFORMATION)) {
					continue; // if the model does not exist in pricing information, skip token & cost calculation for now
				}
				totalTokens += completionTokens + promptTokens;
				const inputCost =
					promptTokens *
					LLM_PRICING_INFORMATION[modelKey as keyof typeof LLM_PRICING_INFORMATION]['Input'];
				const outputCost =
					completionTokens *
					LLM_PRICING_INFORMATION[modelKey as keyof typeof LLM_PRICING_INFORMATION]['Output'];
				totalCost += inputCost + outputCost;
			}
		}
	}
	return { totalTokens, totalCost };
}
