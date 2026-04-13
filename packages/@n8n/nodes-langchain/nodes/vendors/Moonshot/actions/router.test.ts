import { mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import * as image from './image';
import { router } from './router';
import * as text from './text';

describe('Moonshot router', () => {
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
	const mockImage = jest.spyOn(image.analyze, 'execute');
	const mockText = jest.spyOn(text.message, 'execute');
	const operationMocks = [
		[mockImage, 'image', 'analyze'],
		[mockText, 'text', 'message'],
	];

	beforeEach(() => {
		jest.resetAllMocks();
	});

	it.each(operationMocks)('should call the correct method', async (mock, resource, operation) => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameter) =>
			parameter === 'resource' ? resource : operation,
		);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		(mock as jest.Mock).mockResolvedValue([{ json: { foo: 'bar' } }]);

		const result = await router.call(mockExecuteFunctions);

		expect(mock).toHaveBeenCalledWith(0);
		expect(result).toEqual([[{ json: { foo: 'bar' } }]]);
	});

	it('should return an error if the resource is not supported', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameter) =>
			parameter === 'resource' ? 'foo' : 'bar',
		);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);

		await expect(router.call(mockExecuteFunctions)).rejects.toThrow(
			'The resource "foo" is not supported!',
		);
	});

	it('should loop over all items', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameter) =>
			parameter === 'resource' ? 'text' : 'message',
		);
		mockExecuteFunctions.getInputData.mockReturnValue([
			{ json: { text: 'item 1' } },
			{ json: { text: 'item 2' } },
		]);
		mockText.mockResolvedValueOnce([{ json: { response: 'foo' } }]);
		mockText.mockResolvedValueOnce([{ json: { response: 'bar' } }]);

		const result = await router.call(mockExecuteFunctions);

		expect(result).toEqual([[{ json: { response: 'foo' } }, { json: { response: 'bar' } }]]);
	});

	it('should continue on fail', async () => {
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameter) =>
			parameter === 'resource' ? 'text' : 'message',
		);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		mockText.mockRejectedValue(new Error('Some error'));

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
			parameter === 'resource' ? 'text' : 'message',
		);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockText.mockRejectedValue(new Error('Some error'));

		await expect(router.call(mockExecuteFunctions)).rejects.toThrow('Some error');
	});
});
