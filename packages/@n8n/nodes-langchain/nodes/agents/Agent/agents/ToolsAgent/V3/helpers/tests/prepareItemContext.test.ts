import type { Tool } from '@langchain/classic/tools';
import type { ChatPromptTemplate } from '@langchain/core/prompts';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import * as helpers from '@utils/helpers';
import * as outputParsers from '@utils/output_parsers/N8nOutputParser';

import * as commonHelpers from '../../../common';
import { prepareItemContext } from '../prepareItemContext';

vi.mock('@utils/helpers', () => ({
	getPromptInputByType: vi.fn(),
}));

vi.mock('@utils/output_parsers/N8nOutputParser', () => ({
	getOptionalOutputParser: vi.fn(),
}));

vi.mock('../../../common', () => ({
	getTools: vi.fn(),
	prepareMessages: vi.fn(),
	preparePrompt: vi.fn(),
}));

const mockContext = mock<IExecuteFunctions>();
const mockNode = mock<INode>();

beforeEach(() => {
	vi.clearAllMocks();
	mockContext.getNode.mockReturnValue(mockNode);
});

describe('processItem', () => {
	it('should throw error when text parameter is empty', async () => {
		vi.spyOn(helpers, 'getPromptInputByType').mockReturnValue(undefined as any);

		await expect(prepareItemContext(mockContext, 0)).rejects.toThrow(
			'The "text" parameter is empty.',
		);
	});

	it('should process item and return context', async () => {
		const mockTool = mock<Tool>();
		const mockPrompt = mock<ChatPromptTemplate>();

		vi.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');
		vi.spyOn(outputParsers, 'getOptionalOutputParser').mockResolvedValue(undefined);
		vi.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		vi.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		vi.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mockPrompt);

		mockContext.getNodeParameter.mockImplementation((param) => {
			if (param === 'options') {
				return {
					systemMessage: 'You are a helpful assistant',
					maxIterations: 10,
					returnIntermediateSteps: false,
					passthroughBinaryImages: true,
				};
			}
			return undefined;
		});

		const result = await prepareItemContext(mockContext, 0);

		expect(result).not.toBeNull();
		expect(result?.itemIndex).toBe(0);
		expect(result?.input).toBe('test input');
		expect(result?.tools).toEqual([mockTool]);
		expect(result?.prompt).toBe(mockPrompt);
		expect(result?.steps).toEqual([]);
	});

	it('should enable streaming by default when not specified', async () => {
		const mockTool = mock<Tool>();
		const mockPrompt = mock<ChatPromptTemplate>();

		vi.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');
		vi.spyOn(outputParsers, 'getOptionalOutputParser').mockResolvedValue(undefined);
		vi.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		vi.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		vi.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mockPrompt);

		mockContext.getNodeParameter.mockImplementation((param) => {
			if (param === 'options') {
				return {
					systemMessage: 'You are a helpful assistant',
					// enableStreaming not set
				};
			}
			return undefined;
		});

		const result = await prepareItemContext(mockContext, 0);

		expect(result?.options.enableStreaming).toBe(true);
	});

	it('should respect enableStreaming option when set', async () => {
		const mockTool = mock<Tool>();
		const mockPrompt = mock<ChatPromptTemplate>();

		vi.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');
		vi.spyOn(outputParsers, 'getOptionalOutputParser').mockResolvedValue(undefined);
		vi.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		vi.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		vi.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mockPrompt);

		mockContext.getNodeParameter.mockImplementation((param) => {
			if (param === 'options') {
				return {
					systemMessage: 'You are a helpful assistant',
					enableStreaming: false,
				};
			}
			return undefined;
		});

		const result = await prepareItemContext(mockContext, 0);

		expect(result?.options.enableStreaming).toBe(false);
	});

	it('should include output parser when available', async () => {
		const mockTool = mock<Tool>();
		const mockPrompt = mock<ChatPromptTemplate>();
		const mockOutputParser = mock<any>();

		vi.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');
		vi.spyOn(outputParsers, 'getOptionalOutputParser').mockResolvedValue(mockOutputParser);
		vi.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		vi.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		vi.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mockPrompt);

		mockContext.getNodeParameter.mockImplementation((param) => {
			if (param === 'options') {
				return {
					systemMessage: 'You are a helpful assistant',
				};
			}
			return undefined;
		});

		const result = await prepareItemContext(mockContext, 0);

		expect(result?.outputParser).toBe(mockOutputParser);
	});

	it('should pass outputParser to prepareMessages', async () => {
		const mockTool = mock<Tool>();
		const mockPrompt = mock<ChatPromptTemplate>();
		const mockOutputParser = mock<any>();

		vi.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');
		vi.spyOn(outputParsers, 'getOptionalOutputParser').mockResolvedValue(mockOutputParser);
		vi.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		vi.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		vi.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mockPrompt);

		mockContext.getNodeParameter.mockImplementation((param) => {
			if (param === 'options') {
				return {
					systemMessage: 'Test system message',
					passthroughBinaryImages: false,
				};
			}
			return undefined;
		});

		await prepareItemContext(mockContext, 0);

		expect(commonHelpers.prepareMessages).toHaveBeenCalledWith(mockContext, 0, {
			systemMessage: 'Test system message',
			passthroughBinaryImages: false,
			outputParser: mockOutputParser,
		});
	});

	it('should use passthroughBinaryImages default value when not specified', async () => {
		const mockTool = mock<Tool>();
		const mockPrompt = mock<ChatPromptTemplate>();

		vi.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');
		vi.spyOn(outputParsers, 'getOptionalOutputParser').mockResolvedValue(undefined);
		vi.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		vi.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		vi.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mockPrompt);

		mockContext.getNodeParameter.mockImplementation((param) => {
			if (param === 'options') {
				return {
					systemMessage: 'Test system message',
					// passthroughBinaryImages not set
				};
			}
			return undefined;
		});

		await prepareItemContext(mockContext, 0);

		expect(commonHelpers.prepareMessages).toHaveBeenCalledWith(
			mockContext,
			0,
			expect.objectContaining({
				passthroughBinaryImages: true,
			}),
		);
	});
});
