// ToolsAgent.test.ts
import type { BaseChatMemory } from '@langchain/community/memory/chat_memory';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import type { BaseMessagePromptTemplateLike } from '@langchain/core/prompts';
import { FakeTool } from '@langchain/core/utils/testing';
import { Buffer } from 'buffer';
import { mock } from 'jest-mock-extended';
import type { ToolsAgentAction } from 'langchain/dist/agents/tool_calling/output_parser';
import type { Tool } from 'langchain/tools';
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError, BINARY_ENCODING } from 'n8n-workflow';
import type { ZodType } from 'zod';
import { z } from 'zod';

import * as helpersModule from '@utils/helpers';
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
} from '../agents/ToolsAgent/execute';

// We need to override the imported getConnectedTools so that we control its output.
jest.spyOn(helpersModule, 'getConnectedTools').mockResolvedValue([FakeTool as unknown as Tool]);

function getFakeOutputParser(returnSchema?: ZodType): N8nOutputParser {
	const fakeOutputParser = mock<N8nOutputParser>();
	(fakeOutputParser.getSchema as jest.Mock).mockReturnValue(returnSchema);
	return fakeOutputParser;
}

function createFakeExecuteFunctions(overrides: Partial<IExecuteFunctions> = {}): IExecuteFunctions {
	return {
		getNodeParameter: jest
			.fn()
			.mockImplementation((_arg1: string, _arg2: number, defaultValue?: unknown) => {
				return defaultValue;
			}),
		getNode: jest.fn().mockReturnValue({}),
		getInputConnectionData: jest.fn().mockResolvedValue({}),
		getInputData: jest.fn().mockReturnValue([]),
		continueOnFail: jest.fn().mockReturnValue(false),
		logger: { debug: jest.fn() },
		helpers: {},
		...overrides,
	} as unknown as IExecuteFunctions;
}

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
			binary: {
				img1: {
					mimeType: 'image/png',
					// simulate that data already includes 'base64'
					data: 'data:image/png;base64,sampledata',
				},
			},
		};
		const ctx = createFakeExecuteFunctions({
			getInputData: jest.fn().mockReturnValue([fakeItem]),
		});

		const humanMsg: HumanMessage = await extractBinaryMessages(ctx, 0);
		// Expect the HumanMessage's content to be an array containing one binary message.
		expect(Array.isArray(humanMsg.content)).toBe(true);
		expect(humanMsg.content[0]).toEqual({
			type: 'image_url',
			image_url: { url: 'data:image/png;base64,sampledata' },
		});
	});

	it('should extract a binary message using binary stream if id is provided', async () => {
		const fakeItem = {
			binary: {
				img2: {
					mimeType: 'image/jpeg',
					id: '1234',
					data: 'nonsense',
				},
			},
		};
		// Cast fakeHelpers as any to satisfy type requirements.
		const fakeHelpers = {
			getBinaryStream: jest.fn().mockResolvedValue('stream'),
			binaryToBuffer: jest.fn().mockResolvedValue(Buffer.from('fakebufferdata')),
		} as unknown as IExecuteFunctions['helpers'];
		const ctx = createFakeExecuteFunctions({
			getInputData: jest.fn().mockReturnValue([fakeItem]),
			helpers: fakeHelpers,
		});

		const humanMsg: HumanMessage = await extractBinaryMessages(ctx, 0);
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(fakeHelpers.getBinaryStream).toHaveBeenCalledWith('1234');
		// eslint-disable-next-line @typescript-eslint/unbound-method
		expect(fakeHelpers.binaryToBuffer).toHaveBeenCalled();
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

		const ctx = createFakeExecuteFunctions({
			getInputConnectionData: jest.fn().mockResolvedValue(fakeChatModel),
		});
		const model = await getChatModel(ctx);
		expect(model).toEqual(fakeChatModel);
	});

	it('should throw if the model is not a valid chat model', async () => {
		const fakeInvalidModel = mock<BaseChatModel>(); // missing bindTools & lc_namespace
		fakeInvalidModel.lc_namespace = [];
		const ctx = createFakeExecuteFunctions({
			getInputConnectionData: jest.fn().mockResolvedValue(fakeInvalidModel),
			getNode: jest.fn().mockReturnValue({}),
		});
		await expect(getChatModel(ctx)).rejects.toThrow(NodeOperationError);
	});
});

describe('getOptionalMemory', () => {
	it('should return the memory if available', async () => {
		const fakeMemory = { some: 'memory' };
		const ctx = createFakeExecuteFunctions({
			getInputConnectionData: jest.fn().mockResolvedValue(fakeMemory),
		});
		const memory = await getOptionalMemory(ctx);
		expect(memory).toEqual(fakeMemory);
	});
});

describe('getTools', () => {
	it('should retrieve tools without appending if outputParser is not provided', async () => {
		const ctx = createFakeExecuteFunctions();
		const tools = await getTools(ctx);

		expect(tools.length).toEqual(1);
	});

	it('should retrieve tools and append the structured output parser tool if outputParser is provided', async () => {
		const fakeOutputParser = getFakeOutputParser(z.object({ text: z.string() }));
		const ctx = createFakeExecuteFunctions();
		const tools = await getTools(ctx, fakeOutputParser);
		// Our fake getConnectedTools returns one tool; with outputParser, one extra is appended.
		expect(tools.length).toEqual(2);
		const dynamicTool = tools.find((t) => t.name === 'format_final_response');
		expect(dynamicTool).toBeDefined();
	});
});

describe('prepareMessages', () => {
	it('should include a binary message if binary data is present and passthroughBinaryImages is true', async () => {
		const fakeItem = {
			binary: {
				img1: {
					mimeType: 'image/png',
					data: 'data:image/png;base64,sampledata',
				},
			},
		};
		const ctx = createFakeExecuteFunctions({
			getInputData: jest.fn().mockReturnValue([fakeItem]),
		});
		const messages = await prepareMessages(ctx, 0, {
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
		const ctx = createFakeExecuteFunctions({
			getInputData: jest.fn().mockReturnValue([fakeItem]),
		});
		const messages = await prepareMessages(ctx, 0, {
			systemMessage: 'Test system',
			passthroughBinaryImages: true,
		});
		const hasHumanMessage = messages.some((m) => m instanceof HumanMessage);
		expect(hasHumanMessage).toBe(false);
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
