import { HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, PromptTemplate } from '@langchain/core/prompts';
import { FakeLLM, FakeChatModel } from '@langchain/core/utils/testing';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';
import { OperationalError } from 'n8n-workflow';

import * as imageUtils from '../methods/imageUtils';
import { createPromptTemplate } from '../methods/promptUtils';
import type { MessageTemplate } from '../methods/types';

jest.mock('../methods/imageUtils', () => ({
	createImageMessage: jest.fn(),
}));

describe('promptUtils', () => {
	describe('createPromptTemplate', () => {
		let mockContext: jest.Mocked<IExecuteFunctions>;

		beforeEach(() => {
			mockContext = mock<IExecuteFunctions>();
			jest.clearAllMocks();
		});

		it('should create a simple prompt template for non-chat models', async () => {
			const fakeLLM = new FakeLLM({});
			const result = await createPromptTemplate({
				context: mockContext,
				itemIndex: 0,
				llm: fakeLLM,
				query: 'Test query',
			});

			expect(result).toBeInstanceOf(PromptTemplate);
			expect(result.inputVariables).toContain('query');
		});

		it('should create a prompt template with format instructions', async () => {
			const fakeLLM = new FakeLLM({});
			const formatInstructions = 'Format your response as JSON';

			const result = await createPromptTemplate({
				context: mockContext,
				itemIndex: 0,
				llm: fakeLLM,
				formatInstructions,
				query: 'Test query',
			});

			expect(result).toBeInstanceOf(PromptTemplate);
			expect(result.inputVariables).toContain('query');

			// Check that format instructions are included in the template
			const formattedResult = await result.format({ query: 'Test' });
			expect(formattedResult).toContain(formatInstructions);
		});

		it('should create a chat prompt template for chat models', async () => {
			const fakeChatModel = new FakeChatModel({});

			const result = await createPromptTemplate({
				context: mockContext,
				itemIndex: 0,
				llm: fakeChatModel,
				query: 'Test query',
			});

			expect(result).toBeInstanceOf(ChatPromptTemplate);
		});

		it('should process text messages correctly', async () => {
			const fakeChatModel = new FakeChatModel({});
			const messages: MessageTemplate[] = [
				{
					type: 'SystemMessagePromptTemplate',
					message: 'You are a helpful assistant',
					messageType: 'text',
				},
				{
					type: 'AIMessagePromptTemplate',
					message: 'How can I help you?',
					messageType: 'text',
				},
			];

			const result = await createPromptTemplate({
				context: mockContext,
				itemIndex: 0,
				llm: fakeChatModel,
				messages,
				query: 'Tell me a joke',
			});

			expect(result).toBeInstanceOf(ChatPromptTemplate);

			const formattedMessages = await (result as ChatPromptTemplate).formatMessages({
				query: 'Tell me a joke',
			});
			expect(formattedMessages).toHaveLength(3); // 2 messages + 1 query
			expect(formattedMessages[0].content).toBe('You are a helpful assistant');
			expect(formattedMessages[1].content).toBe('How can I help you?');
		});

		it('should escape curly braces in messages', async () => {
			const fakeChatModel = new FakeChatModel({});
			const messages: MessageTemplate[] = [
				{
					type: 'SystemMessagePromptTemplate',
					message: 'You are a {helpful} assistant',
					messageType: 'text',
				},
			];

			const result = await createPromptTemplate({
				context: mockContext,
				itemIndex: 0,
				llm: fakeChatModel,
				messages,
				query: 'Tell me a joke',
			});

			// Validate the messages have escaped curly braces
			const formattedMessages = await (result as ChatPromptTemplate).formatMessages({
				query: 'Tell me a joke',
			});
			expect(formattedMessages[0].content).toBe('You are a {helpful} assistant');
		});

		it('should handle image messages by calling createImageMessage', async () => {
			const fakeChatModel = new FakeChatModel({});
			const imageMessage: MessageTemplate = {
				type: 'HumanMessagePromptTemplate',
				message: '',
				messageType: 'imageUrl',
				imageUrl: 'https://example.com/image.jpg',
			};

			// Mock the image message creation
			const mockHumanMessage = new HumanMessage({
				content: [{ type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } }],
			});
			(imageUtils.createImageMessage as jest.Mock).mockResolvedValue(mockHumanMessage);

			await createPromptTemplate({
				context: mockContext,
				itemIndex: 0,
				llm: fakeChatModel,
				messages: [imageMessage],
				query: 'Describe this image',
			});

			expect(imageUtils.createImageMessage).toHaveBeenCalledWith({
				context: mockContext,
				itemIndex: 0,
				message: imageMessage,
			});
		});

		it('should throw an error for invalid message types', async () => {
			const fakeChatModel = new FakeChatModel({});
			const messages: MessageTemplate[] = [
				{
					type: 'InvalidMessageType',
					message: 'This is an invalid message',
					messageType: 'text',
				},
			];

			await expect(
				createPromptTemplate({
					context: mockContext,
					itemIndex: 0,
					llm: fakeChatModel,
					messages,
					query: 'Test query',
				}),
			).rejects.toThrow(OperationalError);
		});

		it('should add the query to an existing human message with content if it exists', async () => {
			const fakeChatModel = new FakeChatModel({});

			// Create a mock image message with content array
			const mockHumanMessage = new HumanMessage({
				content: [{ type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } }],
			});
			(imageUtils.createImageMessage as jest.Mock).mockResolvedValue(mockHumanMessage);

			const imageMessage: MessageTemplate = {
				type: 'HumanMessagePromptTemplate',
				message: '',
				messageType: 'imageUrl',
				imageUrl: 'https://example.com/image.jpg',
			};

			const result = await createPromptTemplate({
				context: mockContext,
				itemIndex: 0,
				llm: fakeChatModel,
				messages: [imageMessage],
				query: 'Describe this image',
			});

			// Format the message and check that the query was added to the existing content
			const formattedMessages = await (result as ChatPromptTemplate).formatMessages({
				query: 'Describe this image',
			});
			expect(formattedMessages).toHaveLength(1);

			// The content should now have the original image and the text query
			const content = formattedMessages[0].content as any[];
			expect(content).toHaveLength(2);
			expect(content[0].type).toBe('image_url');
			expect(content[1].type).toBe('text');
			expect(content[1].text).toContain('Describe this image');
		});
	});
});
