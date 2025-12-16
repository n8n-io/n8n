import { mock } from 'jest-mock-extended';
import { NodeConnectionTypes } from 'n8n-workflow';
import type { IRunData } from 'n8n-workflow';

import { extractTokenUsage } from '../utils.ee';

type TokenUsage = {
	completionTokens: number;
	promptTokens: number;
	totalTokens: number;
};

type JsonData = {
	tokenUsage?: TokenUsage | null;
	tokenUsageEstimate?: TokenUsage | null;
	[key: string]: unknown;
};

function createRunDataMock(nodeConfigs: Record<string, JsonData[]>) {
	const runData: Record<string, unknown[]> = {};

	for (const [nodeName, jsonValues] of Object.entries(nodeConfigs)) {
		if (
			jsonValues.some(
				(json) => json.tokenUsage !== undefined || json.tokenUsageEstimate !== undefined,
			)
		) {
			// AI node with language model data
			runData[nodeName] = jsonValues.map((json) => ({
				data: {
					[NodeConnectionTypes.AiLanguageModel]: [[{ json }]],
				},
			}));
		} else {
			// Non-AI node with main data
			runData[nodeName] = jsonValues.map((json) => ({
				data: {
					main: [[{ json }]],
				},
			}));
		}
	}

	return mock<IRunData>(runData as any);
}

describe('extractTokenUsage', () => {
	describe('Basic Token Extraction', () => {
		it('extracts token usage from single AI node', () => {
			const runData = createRunDataMock({
				'OpenAI Chat Model': [
					{
						tokenUsage: {
							completionTokens: 16,
							promptTokens: 69,
							totalTokens: 85,
						},
					},
				],
			});

			const result = extractTokenUsage(runData);

			expect(result.total).toEqual({
				completionTokens: 16,
				promptTokens: 69,
				totalTokens: 85,
			});
		});

		it('extracts token usage from multiple AI node executions', () => {
			const runData = createRunDataMock({
				'OpenAI Chat Model': [
					{
						tokenUsage: {
							completionTokens: 16,
							promptTokens: 69,
							totalTokens: 85,
						},
					},
					{
						tokenUsage: {
							completionTokens: 46,
							promptTokens: 138,
							totalTokens: 184,
						},
					},
				],
			});

			const result = extractTokenUsage(runData);

			expect(result.total).toEqual({
				completionTokens: 62,
				promptTokens: 207,
				totalTokens: 269,
			});
		});

		it('extracts token usage from mixed AI nodes', () => {
			const runData = createRunDataMock({
				'OpenAI Chat Model': [
					{
						tokenUsage: {
							completionTokens: 16,
							promptTokens: 69,
							totalTokens: 85,
						},
					},
				],
				'Claude Model': [
					{
						tokenUsage: {
							completionTokens: 25,
							promptTokens: 50,
							totalTokens: 75,
						},
					},
				],
			});

			const result = extractTokenUsage(runData);

			expect(result.total).toEqual({
				completionTokens: 41,
				promptTokens: 119,
				totalTokens: 160,
			});
		});
	});

	describe('Token Usage Sources', () => {
		it('extracts from tokenUsageEstimate property', () => {
			const runData = createRunDataMock({
				'OpenAI Chat Model': [
					{
						tokenUsage: undefined,
						tokenUsageEstimate: {
							completionTokens: 20,
							promptTokens: 80,
							totalTokens: 100,
						},
					},
				],
			});

			const result = extractTokenUsage(runData);

			expect(result.total).toEqual({
				completionTokens: 20,
				promptTokens: 80,
				totalTokens: 100,
			});
		});

		it('prioritizes tokenUsage over tokenUsageEstimate', () => {
			const runData = createRunDataMock({
				'OpenAI Chat Model': [
					{
						tokenUsage: {
							completionTokens: 16,
							promptTokens: 69,
							totalTokens: 85,
						},
						tokenUsageEstimate: {
							completionTokens: 20,
							promptTokens: 80,
							totalTokens: 100,
						},
					},
				],
			});

			const result = extractTokenUsage(runData);

			expect(result.total).toEqual({
				completionTokens: 16,
				promptTokens: 69,
				totalTokens: 85,
			});
		});
	});

	describe('Null/Undefined Token Data', () => {
		it('handles missing token usage data', () => {
			const runData = createRunDataMock({
				'OpenAI Chat Model': [{}],
			});

			const result = extractTokenUsage(runData);

			expect(result.total).toEqual({
				completionTokens: 0,
				promptTokens: 0,
				totalTokens: 0,
			});
		});

		it('handles null token usage data', () => {
			const runData = createRunDataMock({
				'OpenAI Chat Model': [
					{
						tokenUsage: null,
					},
				],
			});

			const result = extractTokenUsage(runData);

			expect(result.total).toEqual({
				completionTokens: 0,
				promptTokens: 0,
				totalTokens: 0,
			});
		});
	});

	describe('Edge cases', () => {
		it('handles empty AI node data', () => {
			const runData = mock<IRunData>({
				'OpenAI Chat Model': [
					{
						data: {
							[NodeConnectionTypes.AiLanguageModel]: [],
						},
					},
				],
			});

			const result = extractTokenUsage(runData);

			expect(result.total).toEqual({
				completionTokens: 0,
				promptTokens: 0,
				totalTokens: 0,
			});
		});

		it('handles missing AI node execution data', () => {
			const runData = mock<IRunData>({
				'OpenAI Chat Model': [
					{
						data: {
							[NodeConnectionTypes.AiLanguageModel]: [[]],
						},
					},
				],
			});

			const result = extractTokenUsage(runData);

			expect(result.total).toEqual({
				completionTokens: 0,
				promptTokens: 0,
				totalTokens: 0,
			});
		});

		it('handles empty execution data', () => {
			const runData = createRunDataMock({});

			const result = extractTokenUsage(runData);

			expect(result.total).toEqual({
				completionTokens: 0,
				promptTokens: 0,
				totalTokens: 0,
			});
		});

		it('handles execution with no AI nodes', () => {
			const runData = createRunDataMock({
				'When clicking Execute workflow': [
					{
						text: 'Say HEY',
						code: 1,
					},
				],
			});

			const result = extractTokenUsage(runData);

			expect(result.total).toEqual({
				completionTokens: 0,
				promptTokens: 0,
				totalTokens: 0,
			});
		});
	});
});
