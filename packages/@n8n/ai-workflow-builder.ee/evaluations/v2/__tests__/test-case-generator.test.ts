/**
 * Tests for test case generation.
 *
 * These utilities generate test cases for workflow evaluation,
 * either via LLM or from hardcoded fallback cases.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import type { BaseMessage } from '@langchain/core/messages';
import { mock } from 'jest-mock-extended';

import {
	createTestCaseGenerator,
	basicTestCases,
	type GeneratedTestCase,
} from '../test-case-generator';

describe('Test Case Generator', () => {
	describe('createTestCaseGenerator()', () => {
		let mockLlm: BaseChatModel;
		let mockInvoke: jest.Mock;

		beforeEach(() => {
			mockInvoke = jest.fn().mockResolvedValue({ testCases: [] });
			mockLlm = mock<BaseChatModel>();
			(mockLlm as unknown as { withStructuredOutput: jest.Mock }).withStructuredOutput = jest
				.fn()
				.mockReturnValue({ invoke: mockInvoke });
		});

		it('should return generator with generate method', () => {
			const generator = createTestCaseGenerator(mockLlm);

			expect(generator).toHaveProperty('generate');
			expect(typeof generator.generate).toBe('function');
		});

		it('should call LLM with structured output', async () => {
			const generator = createTestCaseGenerator(mockLlm);
			await generator.generate();

			expect(
				(mockLlm as unknown as { withStructuredOutput: jest.Mock }).withStructuredOutput,
			).toHaveBeenCalled();
			expect(mockInvoke).toHaveBeenCalled();
		});

		it('should include count in generated prompt', async () => {
			const generator = createTestCaseGenerator(mockLlm, { count: 20 });
			await generator.generate();

			// The invoke receives an array of messages
			const messages = mockInvoke.mock.calls[0][0] as BaseMessage[];
			const humanMessageContent = messages[1].content as string;
			expect(humanMessageContent).toContain('20');
		});

		it('should use default count of 10', async () => {
			const generator = createTestCaseGenerator(mockLlm);
			await generator.generate();

			const messages = mockInvoke.mock.calls[0][0] as BaseMessage[];
			const humanMessageContent = messages[1].content as string;
			expect(humanMessageContent).toContain('10');
		});

		it('should include custom focus in generated prompt', async () => {
			const generator = createTestCaseGenerator(mockLlm, {
				focus: 'API integrations only',
			});
			await generator.generate();

			const messages = mockInvoke.mock.calls[0][0] as BaseMessage[];
			const humanMessageContent = messages[1].content as string;
			expect(humanMessageContent).toContain('API integrations only');
		});

		it('should return properly typed test cases', async () => {
			const mockTestCases: GeneratedTestCase[] = [
				{
					id: 'test_001',
					name: 'Email Automation',
					summary: 'Sends automated emails',
					prompt: 'Create a workflow that sends emails',
				},
				{
					id: 'test_002',
					name: 'Data Processing',
					summary: 'Processes CSV data',
					prompt: 'Create a workflow that processes CSV files',
				},
			];
			mockInvoke.mockResolvedValue({ testCases: mockTestCases });

			const generator = createTestCaseGenerator(mockLlm);
			const result = await generator.generate();

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual({
				id: 'test_001',
				name: 'Email Automation',
				summary: 'Sends automated emails',
				prompt: 'Create a workflow that sends emails',
			});
		});

		it('should handle LLM errors gracefully', async () => {
			mockInvoke.mockRejectedValue(new Error('LLM error'));

			const generator = createTestCaseGenerator(mockLlm);

			await expect(generator.generate()).rejects.toThrow('LLM error');
		});

		it('should use complexity option in focus', async () => {
			const generator = createTestCaseGenerator(mockLlm, { complexity: 'complex' });
			await generator.generate();

			const messages = mockInvoke.mock.calls[0][0] as BaseMessage[];
			const humanMessageContent = messages[1].content as string;
			expect(humanMessageContent.toLowerCase()).toContain('complex');
		});

		it('should use simple complexity focus', async () => {
			const generator = createTestCaseGenerator(mockLlm, { complexity: 'simple' });
			await generator.generate();

			const messages = mockInvoke.mock.calls[0][0] as BaseMessage[];
			const humanMessageContent = messages[1].content as string;
			expect(humanMessageContent.toLowerCase()).toContain('simple');
		});

		it('should include system prompt in messages', async () => {
			const generator = createTestCaseGenerator(mockLlm);
			await generator.generate();

			const messages = mockInvoke.mock.calls[0][0] as BaseMessage[];
			expect(messages).toHaveLength(2);
			expect(messages[0]._getType()).toBe('system');
			expect(messages[1]._getType()).toBe('human');
		});
	});

	describe('basicTestCases', () => {
		it('should have at least 5 test cases', () => {
			expect(basicTestCases.length).toBeGreaterThanOrEqual(5);
		});

		it('should have required properties on each test case', () => {
			for (const testCase of basicTestCases) {
				expect(testCase).toHaveProperty('id');
				expect(testCase).toHaveProperty('prompt');
				expect(typeof testCase.id).toBe('string');
				expect(typeof testCase.prompt).toBe('string');
				expect(testCase.id!.length).toBeGreaterThan(0);
				expect(testCase.prompt.length).toBeGreaterThan(0);
			}
		});

		it('should have unique IDs', () => {
			const ids = basicTestCases.map((tc) => tc.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});

		it('should cover different workflow types', () => {
			const prompts = basicTestCases.map((tc) => tc.prompt.toLowerCase());

			// Check for variety in test cases
			const hasEmail = prompts.some((p) => p.includes('email'));
			const hasApi = prompts.some((p) => p.includes('api') || p.includes('webhook'));
			const hasData = prompts.some((p) => p.includes('data') || p.includes('process'));

			expect(hasEmail || hasApi || hasData).toBe(true);
		});

		it('should have meaningful prompts', () => {
			for (const testCase of basicTestCases) {
				// Prompts should be descriptive enough
				expect(testCase.prompt.length).toBeGreaterThan(20);
			}
		});
	});

	describe('generated test cases', () => {
		it('should be compatible with v2 TestCase format', async () => {
			const mockTestCases: GeneratedTestCase[] = [
				{
					id: 'gen_001',
					name: 'Generated Test',
					summary: 'A generated test case',
					prompt: 'Create a workflow',
				},
			];

			const mockInvoke = jest.fn().mockResolvedValue({ testCases: mockTestCases });
			const mockLlm = mock<BaseChatModel>();
			(mockLlm as unknown as { withStructuredOutput: jest.Mock }).withStructuredOutput = jest
				.fn()
				.mockReturnValue({ invoke: mockInvoke });

			const generator = createTestCaseGenerator(mockLlm);
			const generated = await generator.generate();

			// Generated test cases should have id and prompt (compatible with v2 TestCase)
			expect(generated[0].id).toBe('gen_001');
			expect(generated[0].prompt).toBe('Create a workflow');
		});
	});
});
