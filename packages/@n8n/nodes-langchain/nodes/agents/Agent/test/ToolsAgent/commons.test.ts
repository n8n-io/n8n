import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { BaseMessagePromptTemplateLike } from '@langchain/core/prompts';
import { FakeLLM, FakeStreamingChatModel } from '@langchain/core/utils/testing';
import { Buffer } from 'buffer';
import { mock } from 'jest-mock-extended';
import type { ToolsAgentAction } from 'langchain/dist/agents/tool_calling/output_parser';
import type { Tool } from 'langchain/tools';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError, BINARY_ENCODING, NodeConnectionTypes } from 'n8n-workflow';
import type { ZodType } from 'zod';
import { z } from 'zod';

import type { N8nOutputParser } from '@utils/output_parsers/N8nOutputParser';

import {
	getOutputParserSchema,
	extractBinaryMessages,
	fixEmptyContentMessage,
	handleParsedStepOutput,
	getChatModel,
	getOptionalMemory,
	prepareMessages,
	preparePrompt,
	getTools,
} from '../../agents/ToolsAgent/common';

function getFakeOutputParser(returnSchema?: ZodType): N8nOutputParser {
	const fakeOutputParser = mock<N8nOutputParser>();
	(fakeOutputParser.getSchema as jest.Mock).mockReturnValue(returnSchema);
	return fakeOutputParser;
}

const mockHelpers = mock<IExecuteFunctions['helpers']>();
const mockContext = mock<IExecuteFunctions>({ helpers: mockHelpers });

beforeEach(() => jest.resetAllMocks());

describe('getOutputParserSchema', () => {
	it('should return a default schema if getSchema returns undefined', () => {
		const schema = getOutputParserSchema(getFakeOutputParser(undefined));
		// The default schema requires a "text" field.
		expect(() => schema.parse({})).toThrow();
		expect(schema.parse({ text: 'hello' })).toEqual({ text: 'hello' });
	});

	it('should return the custom schema if provided', () => {
		const customSchema = z.object({ custom: z.number() });

		const schema = getOutputParserSchema(getFakeOutputParser(customSchema));
		expect(() => schema.parse({ custom: 'not a number' })).toThrow();
		expect(schema.parse({ custom: 123 })).toEqual({ custom: 123 });
	});
});

describe('extractBinaryMessages', () => {
	it('should extract a binary message from the input data when no id is provided', async () => {
		const fakeItem = {
			json: {},
			binary: {
				img1: {
					mimeType: 'image/png',
					// simulate that data already includes 'base64'
					data: 'data:image/png;base64,sampledata',
				},
			},
		};
		mockContext.getInputData.mockReturnValue([fakeItem]);

		const humanMsg: HumanMessage = await extractBinaryMessages(mockContext, 0);
		// Expect the HumanMessage's content to be an array containing one binary message.
		expect(Array.isArray(humanMsg.content)).toBe(true);
		expect(humanMsg.content[0]).toEqual({
			type: 'image_url',
			image_url: { url: 'data:image/png;base64,sampledata' },
		});
	});

	it('should extract a binary message using binary stream if id is provided', async () => {
		const fakeItem = {
			json: {},
			binary: {
				img2: {
					mimeType: 'image/jpeg',
					id: '1234',
					data: 'nonsense',
				},
			},
		};

		mockHelpers.getBinaryStream.mockResolvedValue(mock());
		mockHelpers.binaryToBuffer.mockResolvedValue(Buffer.from('fakebufferdata'));
		mockContext.getInputData.mockReturnValue([fakeItem]);

		const humanMsg: HumanMessage = await extractBinaryMessages(mockContext, 0);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockHelpers.getBinaryStream).toHaveBeenCalledWith('1234');
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(mockHelpers.binaryToBuffer).toHaveBeenCalled();
		const expectedUrl = `data:image/jpeg;base64,${Buffer.from('fakebufferdata').toString(
			BINARY_ENCODING,
		)}`;
		expect(humanMsg.content[0]).toEqual({
			type: 'image_url',
			image_url: { url: expectedUrl },
		});
	});
});

describe('fixEmptyContentMessage', () => {
	it('should replace empty string inputs with empty objects', () => {
		// Cast to any to bypass type issues with AgentFinish/AgentAction.
		const fakeSteps: ToolsAgentAction[] = [
			{
				messageLog: [
					{
						content: [{ input: '' }, { input: { already: 'object' } }],
					},
				],
			},
		] as unknown as ToolsAgentAction[];
		const fixed = fixEmptyContentMessage(fakeSteps) as ToolsAgentAction[];
		const messageContent = fixed?.[0]?.messageLog?.[0].content;

		// Type assertion needed since we're extending MessageContentComplex
		expect((messageContent?.[0] as { input: unknown })?.input).toEqual({});
		expect((messageContent?.[1] as { input: unknown })?.input).toEqual({ already: 'object' });
	});
});

describe('handleParsedStepOutput', () => {
	it('should stringify the output if memory is provided', () => {
		const output = { key: 'value' };
		const fakeMemory = mock<BaseChatMemory>();
		const result = handleParsedStepOutput(output, fakeMemory);
		expect(result.returnValues).toEqual({ output: JSON.stringify(output) });
		expect(result.log).toEqual('Final response formatted');
	});

	it('should not stringify the output if memory is not provided', () => {
		const output = { key: 'value' };
		const result = handleParsedStepOutput(output);
		expect(result.returnValues).toEqual(output);
	});
});

describe('getChatModel', () => {
	it('should return the model if it is a valid chat model', async () => {
		// Cast fakeChatModel as any
		const fakeChatModel = mock<BaseChatModel>();
		fakeChatModel.bindTools = jest.fn();
		fakeChatModel.lc_namespace = ['chat_models'];
		mockContext.getInputConnectionData.mockResolvedValue(fakeChatModel);

		const model = await getChatModel(mockContext);
		expect(model).toEqual(fakeChatModel);
	});

	it('should throw if the model is not a valid chat model', async () => {
		const fakeInvalidModel = mock<BaseChatModel>(); // missing bindTools & lc_namespace
		fakeInvalidModel.lc_namespace = [];
		mockContext.getInputConnectionData.mockResolvedValue(fakeInvalidModel);
		mockContext.getNode.mockReturnValue(mock());
		await expect(getChatModel(mockContext)).rejects.toThrow(NodeOperationError);
	});

	it('should return the first model when multiple models are connected and no index specified', async () => {
		const fakeChatModel1 = new FakeStreamingChatModel({});
		const fakeChatModel2 = new FakeStreamingChatModel({});

		mockContext.getInputConnectionData.mockResolvedValue([fakeChatModel1, fakeChatModel2]);

		const model = await getChatModel(mockContext);
		expect(model).toEqual(fakeChatModel2); // Should return the last model (reversed array)
	});

	it('should return the model at specified index when multiple models are connected', async () => {
		const fakeChatModel1 = new FakeStreamingChatModel({});

		const fakeChatModel2 = new FakeStreamingChatModel({});

		mockContext.getInputConnectionData.mockResolvedValue([fakeChatModel1, fakeChatModel2]);

		const model = await getChatModel(mockContext, 0);
		expect(model).toEqual(fakeChatModel2); // Should return the first model after reversal (index 0)
	});

	it('should return the fallback model at index 1 when multiple models are connected', async () => {
		const fakeChatModel1 = new FakeStreamingChatModel({});
		const fakeChatModel2 = new FakeStreamingChatModel({});

		mockContext.getInputConnectionData.mockResolvedValue([fakeChatModel1, fakeChatModel2]);

		const model = await getChatModel(mockContext, 1);
		expect(model).toEqual(fakeChatModel1); // Should return the second model after reversal (index 1)
	});

	it('should return undefined when requested index is out of bounds', async () => {
		const fakeChatModel1 = mock<BaseChatModel>();
		fakeChatModel1.bindTools = jest.fn();
		fakeChatModel1.lc_namespace = ['chat_models'];

		mockContext.getInputConnectionData.mockResolvedValue([fakeChatModel1]);
		mockContext.getNode.mockReturnValue(mock());

		const result = await getChatModel(mockContext, 2);

		expect(result).toBeUndefined();
	});

	it('should throw error when single model does not support tools', async () => {
		const fakeInvalidModel = new FakeLLM({}); // doesn't support tool calls

		mockContext.getInputConnectionData.mockResolvedValue(fakeInvalidModel);
		mockContext.getNode.mockReturnValue(mock());

		await expect(getChatModel(mockContext)).rejects.toThrow(NodeOperationError);
		await expect(getChatModel(mockContext)).rejects.toThrow(
			'Tools Agent requires Chat Model which supports Tools calling',
		);
	});

	it('should throw error when model at specified index does not support tools', async () => {
		const fakeChatModel1 = new FakeStreamingChatModel({});
		const fakeInvalidModel = new FakeLLM({}); // doesn't support tool calls

		mockContext.getInputConnectionData.mockResolvedValue([fakeChatModel1, fakeInvalidModel]);
		mockContext.getNode.mockReturnValue(mock());

		await expect(getChatModel(mockContext, 0)).rejects.toThrow(NodeOperationError);
	});
});

describe('getOptionalMemory', () => {
	it('should return the memory if available', async () => {
		const fakeMemory = { some: 'memory' };
		mockContext.getInputConnectionData.mockResolvedValue(fakeMemory);

		const memory = await getOptionalMemory(mockContext);
		expect(memory).toEqual(fakeMemory);
	});
});

describe('getTools', () => {
	beforeEach(() => {
		const fakeTool = mock<Tool>();
		mockContext.getInputConnectionData
			.calledWith(NodeConnectionTypes.AiTool, 0)
			.mockResolvedValue([fakeTool]);
	});

	it('should retrieve tools without appending if outputParser is not provided', async () => {
		const tools = await getTools(mockContext);

		expect(tools.length).toEqual(1);
	});

	it('should retrieve tools and append the structured output parser tool if outputParser is provided', async () => {
		const fakeOutputParser = getFakeOutputParser(z.object({ text: z.string() }));
		const tools = await getTools(mockContext, fakeOutputParser);
		// Our fake getConnectedTools returns one tool; with outputParser, one extra is appended.
		expect(tools.length).toEqual(2);
		const dynamicTool = tools.find((t) => t.name === 'format_final_json_response');
		expect(dynamicTool).toBeDefined();
	});
});

describe('prepareMessages', () => {
	it('should include a binary message if binary data is present and passthroughBinaryImages is true', async () => {
		const fakeItem = {
			json: {},
			binary: {
				img1: {
					mimeType: 'image/png',
					data: 'data:image/png;base64,sampledata',
				},
			},
		};
		mockContext.getInputData.mockReturnValue([fakeItem]);
		const messages = await prepareMessages(mockContext, 0, {
			systemMessage: 'Test system',
			passthroughBinaryImages: true,
		});
		// Check if any message is an instance of HumanMessage
		const hasBinaryMessage = messages.some(
			(m) => typeof m === 'object' && m instanceof HumanMessage,
		);
		expect(hasBinaryMessage).toBe(true);
	});

	it('should not include a binary message if no binary data is present', async () => {
		const fakeItem = { json: {} }; // no binary key
		mockContext.getInputData.mockReturnValue([fakeItem]);
		const messages = await prepareMessages(mockContext, 0, {
			systemMessage: 'Test system',
			passthroughBinaryImages: true,
		});
		const hasHumanMessage = messages.some((m) => m instanceof HumanMessage);
		expect(hasHumanMessage).toBe(false);
	});

	it('should not include a binary message if no image data is present', async () => {
		const fakeItem = {
			json: {},
			binary: {
				img1: {
					mimeType: 'application/pdf',
					data: 'data:application/pdf;base64,sampledata',
				},
			},
		};
		mockContext.getInputData.mockReturnValue([fakeItem]);
		mockContext.logger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		};

		const messages = await prepareMessages(mockContext, 0, {
			systemMessage: 'Test system',
			passthroughBinaryImages: true,
		});
		const hasHumanMessage = messages.some((m) => m instanceof HumanMessage);
		expect(hasHumanMessage).toBe(false);
		expect(mockContext.logger.debug).toHaveBeenCalledTimes(1);
	});

	it('should not include system_message in prompt templates if not provided after version 1.9', async () => {
		const fakeItem = { json: {} };
		const mockNode = mock<INode>();
		mockNode.typeVersion = 1.9;
		mockContext.getInputData.mockReturnValue([fakeItem]);
		mockContext.getNode.mockReturnValue(mockNode);
		const messages = await prepareMessages(mockContext, 0, {});

		expect(messages.length).toBe(3);
		expect(messages).not.toContainEqual(['system', '{system_message}']);
	});

	it('should include system_message in prompt templates if provided after version 1.9', async () => {
		const fakeItem = { json: {} };
		const mockNode = mock<INode>();
		mockNode.typeVersion = 1.9;
		mockContext.getInputData.mockReturnValue([fakeItem]);
		mockContext.getNode.mockReturnValue(mockNode);

		const messages = await prepareMessages(mockContext, 0, { systemMessage: 'Hello' });

		expect(messages.length).toBe(4);
		expect(messages).toContainEqual(['system', '{system_message}']);
	});

	it('should include system_message in prompt templates if not provided before version 1.9', async () => {
		const fakeItem = { json: {} };
		const mockNode = mock<INode>();
		mockNode.typeVersion = 1.8;
		mockContext.getInputData.mockReturnValue([fakeItem]);
		mockContext.getNode.mockReturnValue(mockNode);

		const messages = await prepareMessages(mockContext, 0, {});

		expect(messages.length).toBe(4);
		expect(messages).toContainEqual(['system', '{system_message}']);
	});

	it('should include system_message with formatting_instructions in prompt templates if provided before version 1.9', async () => {
		const fakeItem = { json: {} };
		const mockNode = mock<INode>();
		mockNode.typeVersion = 1.8;
		mockContext.getInputData.mockReturnValue([fakeItem]);
		mockContext.getNode.mockReturnValue(mockNode);

		const messages = await prepareMessages(mockContext, 0, {
			systemMessage: 'Hello',
			outputParser: mock<N8nOutputParser>(),
		});

		expect(messages.length).toBe(4);
		expect(messages).toContainEqual(['system', '{system_message}\n\n{formatting_instructions}']);
	});

	it('should add formatting instructions when omitting system message after version 1.9', async () => {
		const fakeItem = { json: {} };
		const mockNode = mock<INode>();
		mockNode.typeVersion = 1.9;
		mockContext.getInputData.mockReturnValue([fakeItem]);
		mockContext.getNode.mockReturnValue(mockNode);

		const messages = await prepareMessages(mockContext, 0, {
			outputParser: mock<N8nOutputParser>(),
		});

		expect(messages.length).toBe(4);
		expect(messages).toContainEqual(['system', '{formatting_instructions}']);
	});
});

describe('preparePrompt', () => {
	it('should return a ChatPromptTemplate instance', () => {
		const sampleMessages: BaseMessagePromptTemplateLike[] = [
			['system', 'Test'],
			['human', 'Hello'],
		];
		const prompt = preparePrompt(sampleMessages);

		expect(prompt).toBeDefined();
	});
});
