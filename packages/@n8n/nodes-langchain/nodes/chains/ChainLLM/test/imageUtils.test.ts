/* eslint-disable @typescript-eslint/no-unsafe-call */
import { HumanMessage } from '@langchain/core/messages';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatOllama } from '@langchain/ollama';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, IBinaryData, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	createImageMessage,
	dataUriFromImageData,
	UnsupportedMimeTypeError,
} from '../methods/imageUtils';
import type { MessageTemplate } from '../methods/types';

// Mock ChatGoogleGenerativeAI and ChatOllama
jest.mock('@langchain/google-genai', () => ({
	ChatGoogleGenerativeAI: class MockChatGoogleGenerativeAI {},
}));

jest.mock('@langchain/ollama', () => ({
	ChatOllama: class MockChatOllama {},
}));

// Create a better mock for IExecuteFunctions that includes helpers
const createMockExecuteFunctions = () => {
	const mockExec = mock<IExecuteFunctions>();
	// Add missing helpers property with mocked getBinaryDataBuffer
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	mockExec.helpers = {
		getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('Test image data')),
	} as any;
	return mockExec;
};

describe('imageUtils', () => {
	describe('dataUriFromImageData', () => {
		it('should convert image data to data URI', () => {
			const mockBuffer = Buffer.from('Test data');
			const mockBinaryData = mock<IBinaryData>({ mimeType: 'image/jpeg' });

			const dataUri = dataUriFromImageData(mockBinaryData, mockBuffer);
			expect(dataUri).toBe('data:image/jpeg;base64,VGVzdCBkYXRh');
		});

		it('should throw UnsupportedMimeTypeError for non-images', () => {
			const mockBuffer = Buffer.from('Test data');
			const mockBinaryData = mock<IBinaryData>({ mimeType: 'text/plain' });

			expect(() => {
				dataUriFromImageData(mockBinaryData, mockBuffer);
			}).toThrow(UnsupportedMimeTypeError);
		});
	});

	describe('createImageMessage', () => {
		let mockContext: jest.Mocked<IExecuteFunctions>;
		let mockBuffer: Buffer;
		let mockBinaryData: jest.Mocked<IBinaryData>;

		beforeEach(() => {
			mockContext = createMockExecuteFunctions();
			mockBuffer = Buffer.from('Test image data');
			mockBinaryData = mock<IBinaryData>({ mimeType: 'image/png' });

			// Mock required methods
			mockContext.getInputData.mockReturnValue([{ binary: { data: mockBinaryData }, json: {} }]);
			(mockContext.helpers.getBinaryDataBuffer as jest.Mock).mockResolvedValue(mockBuffer);
			mockContext.getInputConnectionData.mockResolvedValue({});
			mockContext.getNode.mockReturnValue({ name: 'TestNode' } as INode);
		});

		it('should throw an error for invalid message type', async () => {
			const message: MessageTemplate = {
				type: 'HumanMessagePromptTemplate',
				message: '',
				messageType: 'text', // Invalid for this test case
			};

			await expect(
				createImageMessage({
					context: mockContext,
					itemIndex: 0,
					message,
				}),
			).rejects.toThrow(NodeOperationError);
		});

		it('should handle image URL messages', async () => {
			const message: MessageTemplate = {
				type: 'HumanMessagePromptTemplate',
				message: '',
				messageType: 'imageUrl',
				imageUrl: 'https://example.com/image.jpg',
				imageDetail: 'high',
			};

			const result = await createImageMessage({
				context: mockContext,
				itemIndex: 0,
				message,
			});

			expect(result).toBeInstanceOf(HumanMessage);
			expect(result.content).toEqual([
				{
					type: 'image_url',
					image_url: {
						url: 'https://example.com/image.jpg',
						detail: 'high',
					},
				},
			]);
		});

		it('should handle image URL messages with auto detail', async () => {
			const message: MessageTemplate = {
				type: 'HumanMessagePromptTemplate',
				message: '',
				messageType: 'imageUrl',
				imageUrl: 'https://example.com/image.jpg',
				imageDetail: 'auto',
			};

			const result = await createImageMessage({
				context: mockContext,
				itemIndex: 0,
				message,
			});

			expect(result).toBeInstanceOf(HumanMessage);
			expect(result.content).toEqual([
				{
					type: 'image_url',
					image_url: {
						url: 'https://example.com/image.jpg',
						detail: undefined, // Auto becomes undefined
					},
				},
			]);
		});

		it('should throw an error when binary data is missing', async () => {
			// Set up missing binary data
			mockContext.getInputData.mockReturnValue([{ json: {} }]); // No binary data

			const message: MessageTemplate = {
				type: 'HumanMessagePromptTemplate',
				message: '',
				messageType: 'imageBinary',
				binaryImageDataKey: 'data',
			};

			await expect(
				createImageMessage({
					context: mockContext,
					itemIndex: 0,
					message,
				}),
			).rejects.toThrow('No binary data set.');
		});

		it('should handle binary image data for regular models', async () => {
			const message: MessageTemplate = {
				type: 'HumanMessagePromptTemplate',
				message: '',
				messageType: 'imageBinary',
				binaryImageDataKey: 'data',
				imageDetail: 'low',
			};

			const result = await createImageMessage({
				context: mockContext,
				itemIndex: 0,
				message,
			});

			expect(result).toBeInstanceOf(HumanMessage);
			expect(result.content).toEqual([
				{
					type: 'image_url',
					image_url: {
						url: 'data:image/png;base64,VGVzdCBpbWFnZSBkYXRh',
						detail: 'low',
					},
				},
			]);
		});

		it('should handle image data differently for GoogleGenerativeAI models', async () => {
			// Mock a Google model - using our mocked class
			mockContext.getInputConnectionData.mockResolvedValue(
				new ChatGoogleGenerativeAI({
					model: 'gemini-2.5-flash',
				}),
			);

			const message: MessageTemplate = {
				type: 'HumanMessagePromptTemplate',
				message: '',
				messageType: 'imageBinary',
				binaryImageDataKey: 'data',
			};

			const result = await createImageMessage({
				context: mockContext,
				itemIndex: 0,
				message,
			});

			expect(result).toBeInstanceOf(HumanMessage);
			expect(result.content).toEqual([
				{
					type: 'image_url',
					image_url: 'data:image/png;base64,VGVzdCBpbWFnZSBkYXRh',
				},
			]);
		});

		it('should handle image data differently for Ollama models', async () => {
			// Mock an Ollama model - using our mocked class
			mockContext.getInputConnectionData.mockResolvedValue(new ChatOllama());

			const message: MessageTemplate = {
				type: 'HumanMessagePromptTemplate',
				message: '',
				messageType: 'imageBinary',
				binaryImageDataKey: 'data',
			};

			const result = await createImageMessage({
				context: mockContext,
				itemIndex: 0,
				message,
			});

			expect(result).toBeInstanceOf(HumanMessage);
			expect(result.content).toEqual([
				{
					type: 'image_url',
					image_url: 'data:image/png;base64,VGVzdCBpbWFnZSBkYXRh',
				},
			]);
		});

		it('should pass through UnsupportedMimeTypeError', async () => {
			// Mock a non-image mime type
			mockBinaryData.mimeType = 'application/pdf';

			const message: MessageTemplate = {
				type: 'HumanMessagePromptTemplate',
				message: '',
				messageType: 'imageBinary',
				binaryImageDataKey: 'data',
			};

			await expect(
				createImageMessage({
					context: mockContext,
					itemIndex: 0,
					message,
				}),
			).rejects.toThrow(NodeOperationError);
		});
	});
});
