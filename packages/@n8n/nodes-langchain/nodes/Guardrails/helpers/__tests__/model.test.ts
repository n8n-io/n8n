import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { AIMessageChunk } from '@langchain/core/messages';
import { mock } from 'jest-mock-extended';

import { runLLMValidation } from '../model';

describe('Guardrail Model Helpers', () => {
	describe('Output Format Validation', () => {
		it('should validate output contains only expected fields', async () => {
			const mockModel = mock<BaseChatModel>();
			mockModel.invoke.mockResolvedValue(
				new AIMessageChunk({
					content: JSON.stringify({
						confidenceScore: 0.5,
						flagged: false,
					}),
				}),
			);

			const result = await runLLMValidation('test-guardrail', 'test input', {
				model: mockModel,
				prompt: 'Test prompt',
				threshold: 0.7,
			});

			expect(result.tripwireTriggered).toBe(false);
			expect(result.confidenceScore).toBe(0.5);
			expect(result.executionFailed).toBe(false);
		});

		it('should reject output with extra fields', async () => {
			const mockModel = mock<BaseChatModel>();
			mockModel.invoke.mockResolvedValue(
				new AIMessageChunk({
					content: JSON.stringify({
						confidenceScore: 0.3,
						flagged: false,
						extraField: 'should not be here',
					}),
				}),
			);

			const result = await runLLMValidation('test-guardrail', 'test input', {
				model: mockModel,
				prompt: 'Test prompt',
				threshold: 0.7,
			});

			// Should fail due to strict schema validation
			expect(result.executionFailed).toBe(true);
			expect(result.tripwireTriggered).toBe(true);
		});

		it('should reject output with renamed fields', async () => {
			const mockModel = mock<BaseChatModel>();
			mockModel.invoke.mockResolvedValue(
				new AIMessageChunk({
					content: JSON.stringify({
						score: 0.3,
						isViolation: false,
					}),
				}),
			);

			const result = await runLLMValidation('test-guardrail', 'test input', {
				model: mockModel,
				prompt: 'Test prompt',
				threshold: 0.7,
			});

			// Should fail due to missing required fields
			expect(result.executionFailed).toBe(true);
			expect(result.tripwireTriggered).toBe(true);
		});

		it('should handle complex nested response structures', async () => {
			const mockModel = mock<BaseChatModel>();
			mockModel.invoke.mockResolvedValue(
				new AIMessageChunk({
					content: JSON.stringify({
						analysis: {
							confidenceScore: 0.8,
							flagged: true,
						},
						confidenceScore: 0.2,
						flagged: false,
					}),
				}),
			);

			const result = await runLLMValidation('test-guardrail', 'test input', {
				model: mockModel,
				prompt: 'Test prompt',
				threshold: 0.7,
			});

			// Should fail due to extra nested fields
			expect(result.executionFailed).toBe(true);
		});

		it('should validate field types are correct', async () => {
			const mockModel = mock<BaseChatModel>();
			mockModel.invoke.mockResolvedValue(
				new AIMessageChunk({
					content: JSON.stringify({
						confidenceScore: '0.5',
						flagged: 'false',
					}),
				}),
			);

			const result = await runLLMValidation('test-guardrail', 'test input', {
				model: mockModel,
				prompt: 'Test prompt',
				threshold: 0.7,
			});

			// Should fail due to incorrect types
			expect(result.executionFailed).toBe(true);
		});

		it('should correctly evaluate confidence threshold', async () => {
			const mockModel = mock<BaseChatModel>();
			mockModel.invoke.mockResolvedValue(
				new AIMessageChunk({
					content: JSON.stringify({
						confidenceScore: 0.8,
						flagged: true,
					}),
				}),
			);

			const result = await runLLMValidation('test-guardrail', 'test input', {
				model: mockModel,
				prompt: 'Test prompt',
				threshold: 0.7,
			});

			expect(result.tripwireTriggered).toBe(true);
			expect(result.confidenceScore).toBe(0.8);
			expect(result.executionFailed).toBe(false);
		});

		it('should not trigger when confidence is below threshold', async () => {
			const mockModel = mock<BaseChatModel>();
			mockModel.invoke.mockResolvedValue(
				new AIMessageChunk({
					content: JSON.stringify({
						confidenceScore: 0.6,
						flagged: true,
					}),
				}),
			);

			const result = await runLLMValidation('test-guardrail', 'test input', {
				model: mockModel,
				prompt: 'Test prompt',
				threshold: 0.7,
			});

			expect(result.tripwireTriggered).toBe(false);
			expect(result.confidenceScore).toBe(0.6);
		});

		it('should require both flagged and threshold conditions', async () => {
			const mockModel = mock<BaseChatModel>();
			mockModel.invoke.mockResolvedValue(
				new AIMessageChunk({
					content: JSON.stringify({
						confidenceScore: 0.9,
						flagged: false,
					}),
				}),
			);

			const result = await runLLMValidation('test-guardrail', 'test input', {
				model: mockModel,
				prompt: 'Test prompt',
				threshold: 0.7,
			});

			// High confidence but not flagged = should not trigger
			expect(result.tripwireTriggered).toBe(false);
		});
	});
});
