import { parseAiContent } from '@/utils/aiUtils';
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
