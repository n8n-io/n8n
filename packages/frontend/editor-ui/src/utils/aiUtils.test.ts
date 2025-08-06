import type { LlmTokenUsageData } from '@/Interface';
import { addTokenUsageData, formatTokenUsageCount, parseAiContent } from '@/utils/aiUtils';
import { NodeConnectionTypes } from 'n8n-workflow';

describe(parseAiContent, () => {
	it('should parse inputOverride data', () => {
		const executionData = [
			{
				json: {
					messages: ['System: You are a helpful assistant\nHuman: test'],
					estimatedTokens: 11,
					options: {
						openai_api_key: {
							lc: 1,
							type: 'secret',
							id: ['OPENAI_API_KEY'],
						},
						model: 'gpt-4o-mini',
						timeout: 60000,
						max_retries: 2,
						configuration: {
							baseURL: 'https://api.openai.com/v1',
						},
						model_kwargs: {},
					},
				},
			},
		];

		expect(parseAiContent(executionData, NodeConnectionTypes.AiLanguageModel)).toEqual([
			{
				parsedContent: {
					data: 'System: You are a helpful assistant\nHuman: test',
					parsed: true,
					type: 'text',
				},
				raw: expect.any(Object),
			},
		]);
	});

	it('should parse response from AI model node', () => {
		const executionData = [
			{
				json: {
					response: {
						generations: [
							[
								{
									text: "It seems like you're testing the interface. How can I assist you today?",
									generationInfo: {
										prompt: 0,
										completion: 0,
										finish_reason: 'stop',
										system_fingerprint: 'fp_b376dfbbd5',
										model_name: 'gpt-4o-mini-2024-07-18',
									},
								},
							],
						],
					},
					tokenUsage: {
						completionTokens: 16,
						promptTokens: 17,
						totalTokens: 33,
					},
				},
			},
		];

		expect(parseAiContent(executionData, NodeConnectionTypes.AiLanguageModel)).toEqual([
			{
				parsedContent: {
					data: ["It seems like you're testing the interface. How can I assist you today?"],
					parsed: true,
					type: 'json',
				},
				raw: expect.any(Object),
			},
		]);
	});
});

describe(addTokenUsageData, () => {
	it('should return sum of consumed tokens', () => {
		expect(
			addTokenUsageData(
				{ completionTokens: 1, promptTokens: 100, totalTokens: 1000, isEstimate: false },
				{ completionTokens: 0, promptTokens: 1, totalTokens: 2, isEstimate: false },
			),
		).toEqual({ completionTokens: 1, promptTokens: 101, totalTokens: 1002, isEstimate: false });
	});

	it('should set isEstimate to true if either of the arguments is an estimation', () => {
		const usageData = { completionTokens: 0, promptTokens: 0, totalTokens: 0, isEstimate: false };

		expect(addTokenUsageData(usageData, usageData)).toEqual({
			...usageData,
			isEstimate: false,
		});
		expect(addTokenUsageData({ ...usageData, isEstimate: true }, usageData)).toEqual({
			...usageData,
			isEstimate: true,
		});
		expect(addTokenUsageData(usageData, { ...usageData, isEstimate: true })).toEqual({
			...usageData,
			isEstimate: true,
		});
		expect(
			addTokenUsageData({ ...usageData, isEstimate: true }, { ...usageData, isEstimate: true }),
		).toEqual({
			...usageData,
			isEstimate: true,
		});
	});
});

describe(formatTokenUsageCount, () => {
	const usageData: LlmTokenUsageData = {
		completionTokens: 11,
		promptTokens: 22,
		totalTokens: 33,
		isEstimate: false,
	};

	it('should return the number of specified field', () => {
		expect(formatTokenUsageCount(usageData, 'completion')).toBe('11');
		expect(formatTokenUsageCount(usageData, 'prompt')).toBe('22');
		expect(formatTokenUsageCount(usageData, 'total')).toBe('33');
	});

	it('should prepend "~" if the usage data is an estimation', () => {
		expect(formatTokenUsageCount({ ...usageData, isEstimate: true }, 'total')).toBe('~33');
	});
});
