import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import * as document from './document';
import * as file from './file';
import * as image from './image';
import * as prompt from './prompt';
import { router } from './router';
import * as text from './text';

describe('Anthropic router', () => {
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
	const mockDocument = jest.spyOn(document.analyze, 'execute');
	const mockFile = jest.spyOn(file.upload, 'execute');
	const mockImage = jest.spyOn(image.analyze, 'execute');
	const mockPrompt = jest.spyOn(prompt.generate, 'execute');
	const mockText = jest.spyOn(text.message, 'execute');
	const operationMocks = [
		[mockDocument, 'document', 'analyze'],
		[mockFile, 'file', 'upload'],
		[mockImage, 'image', 'analyze'],
		[mockText, 'text', 'message'],
		[mockPrompt, 'prompt', 'generate'],
	];

	beforeEach(() => {
		jest.resetAllMocks();
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

	it('should return an error if the operation is not supported', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameter) =>
			parameter === 'resource' ? 'foo' : 'bar',
		);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);

		await expect(router.call(mockExecuteFunctions)).rejects.toThrow(
			'The operation "bar" is not supported!',
		);
	});

	it('should loop over all items', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameter) =>
			parameter === 'resource' ? 'document' : 'analyze',
		);
		mockExecuteFunctions.getInputData.mockReturnValue([
			{
				json: {
					text: 'item 1',
				},
			},
			{
				json: {
					text: 'item 2',
				},
			},
			{
				json: {
					text: 'item 3',
				},
			},
		]);
		mockDocument.mockResolvedValueOnce([{ json: { response: 'foo' } }]);
		mockDocument.mockResolvedValueOnce([{ json: { response: 'bar' } }]);
		mockDocument.mockResolvedValueOnce([{ json: { response: 'baz' } }]);

		const result = await router.call(mockExecuteFunctions);

		expect(result).toEqual([
			[{ json: { response: 'foo' } }, { json: { response: 'bar' } }, { json: { response: 'baz' } }],
		]);
	});

	it('should continue on fail', async () => {
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameter) =>
			parameter === 'resource' ? 'document' : 'analyze',
		);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		mockDocument.mockRejectedValue(new Error('Some error'));

		const result = await router.call(mockExecuteFunctions);

		expect(result).toEqual([
			[
				{ json: { error: 'Some error' }, pairedItem: { item: 0 } },
				{ json: { error: 'Some error' }, pairedItem: { item: 1 } },
			],
		]);
	});

	it('should throw an error if continueOnFail is false', async () => {
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameter) =>
			parameter === 'resource' ? 'document' : 'analyze',
		);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockDocument.mockRejectedValue(new Error('Some error'));

		await expect(router.call(mockExecuteFunctions)).rejects.toThrow('Some error');
	});
});
