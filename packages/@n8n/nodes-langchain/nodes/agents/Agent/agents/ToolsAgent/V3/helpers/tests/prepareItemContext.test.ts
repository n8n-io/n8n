import type { ChatPromptTemplate } from '@langchain/core/prompts';
import { mock } from 'jest-mock-extended';
import type { Tool } from 'langchain/tools';
import type { IExecuteFunctions, INode, EngineResponse } from 'n8n-workflow';

import * as helpers from '@utils/helpers';
import * as outputParsers from '@utils/output_parsers/N8nOutputParser';

import * as commonHelpers from '../../../common';
import type { RequestResponseMetadata } from '../../types';
import { prepareItemContext } from '../prepareItemContext';

jest.mock('@utils/helpers', () => ({
	getPromptInputByType: jest.fn(),
}));

jest.mock('@utils/output_parsers/N8nOutputParser', () => ({
	getOptionalOutputParser: jest.fn(),
}));

jest.mock('../../../common', () => ({
	getTools: jest.fn(),
	prepareMessages: jest.fn(),
	preparePrompt: jest.fn(),
}));

const mockContext = mock<IExecuteFunctions>();
const mockNode = mock<INode>();

beforeEach(() => {
	jest.clearAllMocks();
	mockContext.getNode.mockReturnValue(mockNode);
});

describe('processItem', () => {
	it('should return null when item was already processed', async () => {
		const response: EngineResponse<RequestResponseMetadata> = {
			actionResponses: [],
			metadata: { itemIndex: 0, previousRequests: [] },
		};

		const result = await prepareItemContext(mockContext, 0, response);

		expect(result).toBeNull();
	});

	it('should process item and return context', async () => {
		const mockTool = mock<Tool>();
		const mockPrompt = mock<ChatPromptTemplate>();

		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');
		jest.spyOn(outputParsers, 'getOptionalOutputParser').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mockPrompt);

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

		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');
		jest.spyOn(outputParsers, 'getOptionalOutputParser').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mockPrompt);

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

		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');
		jest.spyOn(outputParsers, 'getOptionalOutputParser').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mockPrompt);

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

		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');
		jest.spyOn(outputParsers, 'getOptionalOutputParser').mockResolvedValue(mockOutputParser);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mockPrompt);

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

		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');
		jest.spyOn(outputParsers, 'getOptionalOutputParser').mockResolvedValue(mockOutputParser);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mockPrompt);

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

		jest.spyOn(helpers, 'getPromptInputByType').mockReturnValue('test input');
		jest.spyOn(outputParsers, 'getOptionalOutputParser').mockResolvedValue(undefined);
		jest.spyOn(commonHelpers, 'getTools').mockResolvedValue([mockTool]);
		jest.spyOn(commonHelpers, 'prepareMessages').mockResolvedValue([]);
		jest.spyOn(commonHelpers, 'preparePrompt').mockReturnValue(mockPrompt);

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
