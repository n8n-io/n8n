import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import * as audio from './audio';
import * as file from './file';
import * as image from './image';
import { router } from './router';
import * as text from './text';

describe('AI Gateway router', () => {
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
	const mockAudio = jest.spyOn(audio.transcribe, 'execute');
	const mockFile = jest.spyOn(file.analyze, 'execute');
	const mockImage = jest.spyOn(image.generate, 'execute');
	const mockTextMessage = jest.spyOn(text.message, 'execute');
	const mockTextJson = jest.spyOn(text.json, 'execute');
	const mockTextVision = jest.spyOn(text.messageVision, 'execute');

	const operationMocks: Array<[jest.SpyInstance, string, string]> = [
		[mockAudio, 'audio', 'transcribe'],
		[mockFile, 'file', 'analyze'],
		[mockImage, 'image', 'generate'],
		[mockTextMessage, 'text', 'message'],
		[mockTextJson, 'text', 'json'],
		[mockTextVision, 'text', 'messageVision'],
	];

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it.each(operationMocks)('should call the correct method', async (mock, resource, operation) => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameter) =>
			parameter === 'resource' ? resource : operation,
		);
		mockExecuteFunctions.getInputData.mockReturnValue([
			{
				json: {},
			},
		]);
		(mock as jest.Mock).mockResolvedValue([
			{
				json: {
					foo: 'bar',
				},
			},
		]);

		const result = await router.call(mockExecuteFunctions);

		expect(mock).toHaveBeenCalledWith(0);
		expect(result).toEqual([[{ json: { foo: 'bar' } }]]);
	});

	it('should return an error if the resource is not supported', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameter) =>
			parameter === 'resource' ? 'unknown' : 'message',
		);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);

		await expect(router.call(mockExecuteFunctions)).rejects.toThrow(
			'The operation "message" is not supported!',
		);
	});

	it('should loop over all items', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameter) =>
			parameter === 'resource' ? 'text' : 'message',
		);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: { a: 1 } }, { json: { b: 2 } }]);
		mockTextMessage.mockResolvedValue([{ json: { out: 1 } }]);

		const result = await router.call(mockExecuteFunctions);

		expect(mockTextMessage).toHaveBeenCalledTimes(2);
		expect(mockTextMessage).toHaveBeenNthCalledWith(1, 0);
		expect(mockTextMessage).toHaveBeenNthCalledWith(2, 1);
		expect(result).toEqual([[{ json: { out: 1 } }, { json: { out: 1 } }]]);
	});
});
