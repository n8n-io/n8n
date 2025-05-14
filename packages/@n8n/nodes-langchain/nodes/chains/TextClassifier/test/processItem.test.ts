import { ChatPromptTemplate } from '@langchain/core/prompts';
import { FakeChatModel } from '@langchain/core/utils/testing';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import * as tracing from '@utils/tracing';

import { processItem } from '../processItem';

jest.mock('@utils/tracing', () => ({
	getTracingConfig: jest.fn(() => ({})),
}));

jest.mock('@langchain/core/prompts', () => ({
	ChatPromptTemplate: {
		fromMessages: jest.fn(),
	},
	SystemMessagePromptTemplate: {
		fromTemplate: jest.fn().mockReturnValue({
			format: jest.fn(),
		}),
	},
}));

describe('processItem', () => {
	let mockContext: jest.Mocked<IExecuteFunctions>;
	let fakeLLM: FakeChatModel;

	beforeEach(() => {
		mockContext = mock<IExecuteFunctions>();
		fakeLLM = new FakeChatModel({});

		mockContext.getNodeParameter.mockImplementation((param, _itemIndex, defaultValue) => {
			if (param === 'inputText') return 'Test input';
			if (param === 'options.systemPromptTemplate') return 'Test system prompt';
			return defaultValue;
		});

		jest.clearAllMocks();
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
			invoke: jest.fn().mockResolvedValue({ test: true }),
		};

		const mockPipe = jest.fn().mockReturnValue({
			pipe: jest.fn().mockReturnValue({
				withConfig: jest.fn().mockReturnValue(mockChain),
			}),
		});

		const mockPrompt = {
			pipe: mockPipe,
		};

		jest.mocked(ChatPromptTemplate.fromMessages).mockReturnValue(mockPrompt as any);

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

	it('should handle fallback prompt', async () => {
		const mockParser = {
			getFormatInstructions: () => '[format instructions]',
		};

		const mockChain = {
			invoke: jest.fn().mockResolvedValue({ category: 'test' }),
		};

		const mockPipe = jest.fn().mockReturnValue({
			pipe: jest.fn().mockReturnValue({
				withConfig: jest.fn().mockReturnValue(mockChain),
			}),
		});

		const mockPrompt = {
			pipe: mockPipe,
		};

		jest.mocked(ChatPromptTemplate.fromMessages).mockReturnValue(mockPrompt as any);

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
