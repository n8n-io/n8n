import { ChatPromptTemplate, SystemMessagePromptTemplate } from '@langchain/core/prompts';
import { FakeChatModel } from '@langchain/core/utils/testing';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import * as tracing from '@utils/tracing';

import { processItem } from '../processItem';
import type { Mocked } from 'vitest';

vi.mock('@utils/tracing', () => ({
	getTracingConfig: vi.fn(() => ({})),
}));

vi.mock('@langchain/core/prompts', () => ({
	ChatPromptTemplate: {
		fromMessages: vi.fn(),
	},
	SystemMessagePromptTemplate: {
		fromTemplate: vi.fn().mockReturnValue({
			format: vi.fn(),
		}),
	},
}));

describe('processItem', () => {
	let mockContext: Mocked<IExecuteFunctions>;
	let fakeLLM: FakeChatModel;

	beforeEach(() => {
		mockContext = mock<IExecuteFunctions>();
		fakeLLM = new FakeChatModel({});

		mockContext.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
			if (param === 'inputText') return 'Test input';
			if (param === 'options.systemPromptTemplate') return 'Test system prompt';
			return defaultValue;
		});

		vi.clearAllMocks();
	});

	it('should throw error for empty input text', async () => {
		mockContext.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
			if (param === 'inputText') return '';
			return defaultValue;
		});

		await expect(
			processItem(
				mockContext,
				0,
				{ json: {} },
				fakeLLM,
				{ getFormatInstructions: () => 'format instructions' } as any,
				[{ category: 'test', description: 'test category' }],
				'multi class prompt',
				undefined,
			),
		).rejects.toThrow(NodeOperationError);
	});

	it('should process item with correct parameters', async () => {
		const mockParser = {
			getFormatInstructions: () => '[format instructions]',
		};

		const mockChain = {
			invoke: vi.fn().mockResolvedValue({ test: true }),
		};

		const mockPipe = vi.fn().mockReturnValue({
			pipe: vi.fn().mockReturnValue({
				withConfig: vi.fn().mockReturnValue(mockChain),
			}),
		});

		const mockPrompt = {
			pipe: mockPipe,
		};

		vi.mocked(ChatPromptTemplate.fromMessages).mockReturnValue(mockPrompt as any);

		const result = await processItem(
			mockContext,
			0,
			{ json: {} },
			fakeLLM,
			mockParser as any,
			[{ category: 'test', description: 'test category' }],
			'multi class prompt',
			undefined,
		);

		expect(result).toEqual({ test: true });
		expect(mockContext.getNodeParameter).toHaveBeenCalledWith('inputText', 0);
		expect(mockContext.getNodeParameter).toHaveBeenCalledWith(
			'options.systemPromptTemplate',
			0,
			expect.any(String),
		);
		expect(tracing.getTracingConfig).toHaveBeenCalledWith(mockContext);
	});

	it('should escape curly braces in custom system prompt template', async () => {
		const templateWithBraces = 'Classify using format {"category": "value"}: {categories}';

		mockContext.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
			if (param === 'inputText') return 'Test input';
			if (param === 'options.systemPromptTemplate') return templateWithBraces;
			return defaultValue;
		});

		const mockParser = {
			getFormatInstructions: () => '[format instructions]',
		};

		const mockChain = {
			invoke: vi.fn().mockResolvedValue({ category: 'test' }),
		};

		const mockPipe = vi.fn().mockReturnValue({
			pipe: vi.fn().mockReturnValue({
				withConfig: vi.fn().mockReturnValue(mockChain),
			}),
		});

		vi.mocked(ChatPromptTemplate.fromMessages).mockReturnValue({ pipe: mockPipe } as any);

		await processItem(
			mockContext,
			0,
			{ json: {} },
			fakeLLM,
			mockParser as any,
			[{ category: 'test', description: 'test category' }],
			'multi class prompt',
			undefined,
		);

		expect(SystemMessagePromptTemplate.fromTemplate).toHaveBeenCalledWith(
			expect.stringContaining('{{"category": "value"}}'),
		);
		expect(SystemMessagePromptTemplate.fromTemplate).toHaveBeenCalledWith(
			expect.stringContaining('{categories}'),
		);
	});

	it('should handle fallback prompt', async () => {
		const mockParser = {
			getFormatInstructions: () => '[format instructions]',
		};

		const mockChain = {
			invoke: vi.fn().mockResolvedValue({ category: 'test' }),
		};

		const mockPipe = vi.fn().mockReturnValue({
			pipe: vi.fn().mockReturnValue({
				withConfig: vi.fn().mockReturnValue(mockChain),
			}),
		});

		const mockPrompt = {
			pipe: mockPipe,
		};

		vi.mocked(ChatPromptTemplate.fromMessages).mockReturnValue(mockPrompt as any);

		await processItem(
			mockContext,
			0,
			{ json: {} },
			fakeLLM,
			mockParser as any,
			[{ category: 'test', description: 'test category' }],
			'multi class prompt',
			'fallback prompt',
		);

		expect(mockContext.getNodeParameter).toHaveBeenCalledWith(
			'options.systemPromptTemplate',
			0,
			expect.any(String),
		);
		expect(tracing.getTracingConfig).toHaveBeenCalledWith(mockContext);
	});
});
