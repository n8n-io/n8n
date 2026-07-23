import type { IExecuteFunctions } from 'n8n-workflow';
import type { Mock, MockInstance } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import * as audio from './audio';
import * as document from './document';
import * as file from './file';
import * as fileSearch from './fileSearch';
import * as image from './image';
import { router } from './router';
import * as text from './text';
import * as video from './video';

describe('Google Gemini router', () => {
	const mockExecuteFunctions = mockDeep<IExecuteFunctions>();
	let mockAudio: MockInstance;
	let mockDocument: MockInstance;
	let mockFile: MockInstance;
	let mockFileSearchCreateStore: MockInstance;
	let mockFileSearchDeleteStore: MockInstance;
	let mockFileSearchListStores: MockInstance;
	let mockFileSearchUploadToStore: MockInstance;
	let mockImage: MockInstance;
	let mockText: MockInstance;
	let mockVideo: MockInstance;
	const operationMocks: Array<[() => MockInstance, string, string]> = [
		[() => mockAudio, 'audio', 'analyze'],
		[() => mockDocument, 'document', 'analyze'],
		[() => mockFile, 'file', 'upload'],
		[() => mockFileSearchCreateStore, 'fileSearch', 'createStore'],
		[() => mockFileSearchDeleteStore, 'fileSearch', 'deleteStore'],
		[() => mockFileSearchListStores, 'fileSearch', 'listStores'],
		[() => mockFileSearchUploadToStore, 'fileSearch', 'uploadToStore'],
		[() => mockImage, 'image', 'analyze'],
		[() => mockText, 'text', 'message'],
		[() => mockVideo, 'video', 'analyze'],
	];

	beforeEach(() => {
		vi.clearAllMocks();
		mockAudio = vi.spyOn(audio.analyze, 'execute');
		mockDocument = vi.spyOn(document.analyze, 'execute');
		mockFile = vi.spyOn(file.upload, 'execute');
		mockFileSearchCreateStore = vi.spyOn(fileSearch.createStore, 'execute');
		mockFileSearchDeleteStore = vi.spyOn(fileSearch.deleteStore, 'execute');
		mockFileSearchListStores = vi.spyOn(fileSearch.listStores, 'execute');
		mockFileSearchUploadToStore = vi.spyOn(fileSearch.uploadToStore, 'execute');
		mockImage = vi.spyOn(image.analyze, 'execute');
		mockText = vi.spyOn(text.message, 'execute');
		mockVideo = vi.spyOn(video.analyze, 'execute');
	});

	it.each(operationMocks)(
		'should call the correct method',
		async (getMock, resource, operation) => {
			const mock = getMock();
			mockExecuteFunctions.getNodeParameter.mockImplementation((parameter) =>
				parameter === 'resource' ? resource : operation,
			);
			mockExecuteFunctions.getInputData.mockReturnValue([
				{
					json: {},
				},
			]);
			(mock as Mock).mockResolvedValue([
				{
					json: {
						foo: 'bar',
					},
				},
			]);

			const result = await router.call(mockExecuteFunctions);

			expect(mock).toHaveBeenCalledWith(0);
			expect(result).toEqual([[{ json: { foo: 'bar' } }]]);
		},
	);

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
			parameter === 'resource' ? 'audio' : 'analyze',
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
		mockAudio.mockResolvedValueOnce([{ json: { response: 'foo' } }]);
		mockAudio.mockResolvedValueOnce([{ json: { response: 'bar' } }]);
		mockAudio.mockResolvedValueOnce([{ json: { response: 'baz' } }]);

		const result = await router.call(mockExecuteFunctions);

		expect(result).toEqual([
			[{ json: { response: 'foo' } }, { json: { response: 'bar' } }, { json: { response: 'baz' } }],
		]);
	});

	it('should continue on fail', async () => {
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);
		mockExecuteFunctions.getNodeParameter.mockImplementation((parameter) =>
			parameter === 'resource' ? 'audio' : 'analyze',
		);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }, { json: {} }]);
		mockAudio.mockRejectedValue(new Error('Some error'));

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
			parameter === 'resource' ? 'audio' : 'analyze',
		);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockAudio.mockRejectedValue(new Error('Some error'));

		await expect(router.call(mockExecuteFunctions)).rejects.toThrow('Some error');
	});
});
