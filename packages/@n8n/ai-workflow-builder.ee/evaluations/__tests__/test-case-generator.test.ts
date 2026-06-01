/**
 * Tests for test case generation.
 *
 * These utilities generate test cases for workflow evaluation,
 * either via LLM or from CSV fixtures.
 */

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { mock } from 'jest-mock-extended';

import { loadDefaultTestCases } from '../cli/csv-prompt-loader';
import { createTestCaseGenerator, type GeneratedTestCase } from '../support/test-case-generator';

/** Type guard for message objects with content */
function isMessageWithContent(msg: unknown): msg is { content: unknown } {
	return msg !== null && typeof msg === 'object' && 'content' in msg;
}

/** Type guard for objects with _getType method */
function hasGetTypeMethod(msg: unknown): msg is { _getType: () => string } {
	if (msg === null || typeof msg !== 'object') return false;
	if (!('_getType' in msg)) return false;
	const obj = msg as { _getType: unknown };
	return typeof obj._getType === 'function';
}

/** Helper to extract messages from mock invoke calls */
function getMessagesFromMockCall(mockInvoke: jest.Mock): { system: string; human: string } {
	const calls = mockInvoke.mock.calls;
	if (calls.length === 0) throw new Error('No calls recorded');

	const firstCall = calls[0];
	if (!Array.isArray(firstCall) || firstCall.length === 0) {
		throw new Error('First call has no arguments');
	}

	const messages = firstCall[0];
	if (!Array.isArray(messages) || messages.length < 2) {
		throw new Error('Messages array invalid');
	}

	const systemMsg = messages[0];
	const humanMsg = messages[1];

	// Type-safe content extraction
	const getContent = (msg: unknown): string => {
		if (isMessageWithContent(msg)) {
			const content = msg.content;
			if (typeof content === 'string') return content;
		}
		return '';
	};

	return {
		system: getContent(systemMsg),
		human: getContent(humanMsg),
	};
}

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

			const { human } = getMessagesFromMockCall(mockInvoke);
			expect(human).toContain('20');
		});

		it('should use default count of 10', async () => {
			const generator = createTestCaseGenerator(mockLlm);
			await generator.generate();

			const { human } = getMessagesFromMockCall(mockInvoke);
			expect(human).toContain('10');
		});

		it('should include custom focus in generated prompt', async () => {
			const generator = createTestCaseGenerator(mockLlm, {
				focus: 'API integrations only',
			});
			await generator.generate();

			const { human } = getMessagesFromMockCall(mockInvoke);
			expect(human).toContain('API integrations only');
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

			const { human } = getMessagesFromMockCall(mockInvoke);
			expect(human.toLowerCase()).toContain('complex');
		});

		it('should use simple complexity focus', async () => {
			const generator = createTestCaseGenerator(mockLlm, { complexity: 'simple' });
			await generator.generate();

			const { human } = getMessagesFromMockCall(mockInvoke);
			expect(human.toLowerCase()).toContain('simple');
		});

		it('should include system prompt in messages', async () => {
			const generator = createTestCaseGenerator(mockLlm);
			await generator.generate();

			const calls = mockInvoke.mock.calls;
			expect(calls.length).toBeGreaterThan(0);

			// Extract messages from mock calls with proper type narrowing
			const firstCall = calls[0];
			if (!Array.isArray(firstCall) || firstCall.length === 0) {
				throw new Error('Expected firstCall to be a non-empty array');
			}
			const firstArg = firstCall[0];
			if (!Array.isArray(firstArg)) {
				throw new Error('Expected first argument to be an array');
			}
			const messages = firstArg;
			expect(messages).toHaveLength(2);

			// Verify message types using type guard
			const systemMsg = messages[0];
			const humanMsg = messages[1];
			expect(hasGetTypeMethod(systemMsg)).toBe(true);
			expect(hasGetTypeMethod(humanMsg)).toBe(true);
			if (hasGetTypeMethod(systemMsg)) {
				expect(systemMsg._getType()).toBe('system');
			}
			if (hasGetTypeMethod(humanMsg)) {
				expect(humanMsg._getType()).toBe('human');
			}
		});
	});

	describe('loadDefaultTestCases', () => {
		it('should have at least 5 test cases', () => {
			const defaultCases = loadDefaultTestCases();
			expect(defaultCases.length).toBeGreaterThanOrEqual(5);
		});

		it('should have required properties on each test case', () => {
			const defaultCases = loadDefaultTestCases();
			for (const testCase of defaultCases) {
				expect(testCase).toHaveProperty('id');
				expect(testCase).toHaveProperty('prompt');
				expect(typeof testCase.id).toBe('string');
				expect(typeof testCase.prompt).toBe('string');
				expect(testCase.id!.length).toBeGreaterThan(0);
				expect(testCase.prompt.length).toBeGreaterThan(0);
			}
		});

		it('should have unique IDs', () => {
			const defaultCases = loadDefaultTestCases();
			const ids = defaultCases.map((tc) => tc.id);
			const uniqueIds = new Set(ids);
			expect(uniqueIds.size).toBe(ids.length);
		});

		it('should cover different workflow types', () => {
			const defaultCases = loadDefaultTestCases();
			const prompts = defaultCases.map((tc) => tc.prompt.toLowerCase());

			// Check for variety in test cases
			const hasEmail = prompts.some((p) => p.includes('email'));
			const hasApi = prompts.some((p) => p.includes('api') || p.includes('webhook'));
			const hasData = prompts.some((p) => p.includes('data') || p.includes('process'));

			expect(hasEmail || hasApi || hasData).toBe(true);
		});

		it('should have meaningful prompts', () => {
			const defaultCases = loadDefaultTestCases();
			for (const testCase of defaultCases) {
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
