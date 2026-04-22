import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

jest.mock('../actions/text', () => ({
	message: { execute: jest.fn() },
}));

jest.mock('../actions/image', () => ({
	generate: { execute: jest.fn() },
}));

jest.mock('../actions/video', () => ({
	textToVideo: { execute: jest.fn() },
	imageToVideo: { execute: jest.fn() },
}));

jest.mock('../actions/audio', () => ({
	textToSpeech: { execute: jest.fn() },
}));

import { router } from '../actions/router';
import * as text from '../actions/text';
import * as image from '../actions/image';
import * as video from '../actions/video';
import * as audio from '../actions/audio';

describe('MiniMax Router', () => {
	let mockExecuteFunctions: ReturnType<typeof mock<IExecuteFunctions>>;

	const mockNode = {
		id: 'test-node-id',
		name: 'Test Node',
		type: '@n8n/n8n-nodes-langchain.minimax',
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
	};

	beforeEach(() => {
		mockExecuteFunctions = mock<IExecuteFunctions>();
		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getInputData.mockReturnValue([{ json: {} }]);
		mockExecuteFunctions.continueOnFail.mockReturnValue(false);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should route text/message to text.message.execute', async () => {
		const expectedResult: INodeExecutionData = { json: { text: 'hello' }, pairedItem: 0 };
		(text.message.execute as jest.Mock).mockResolvedValue([expectedResult]);
		mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'resource') return 'text';
			if (param === 'operation') return 'message';
			return undefined;
		});

		const result = await router.call(mockExecuteFunctions);

		expect(text.message.execute).toHaveBeenCalledTimes(1);
		expect(result).toEqual([[expectedResult]]);
	});

	it('should route image/generate to image.generate.execute', async () => {
		const expectedResult: INodeExecutionData = {
			json: { imageUrl: 'https://example.com/img.png' },
			pairedItem: 0,
		};
		(image.generate.execute as jest.Mock).mockResolvedValue([expectedResult]);
		mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'resource') return 'image';
			if (param === 'operation') return 'generate';
			return undefined;
		});

		const result = await router.call(mockExecuteFunctions);

		expect(image.generate.execute).toHaveBeenCalledTimes(1);
		expect(result).toEqual([[expectedResult]]);
	});

	it('should route video/textToVideo to video.textToVideo.execute', async () => {
		const expectedResult: INodeExecutionData = {
			json: { videoUrl: 'https://example.com/video.mp4' },
			pairedItem: 0,
		};
		(video.textToVideo.execute as jest.Mock).mockResolvedValue([expectedResult]);
		mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'resource') return 'video';
			if (param === 'operation') return 'textToVideo';
			return undefined;
		});

		const result = await router.call(mockExecuteFunctions);

		expect(video.textToVideo.execute).toHaveBeenCalledTimes(1);
		expect(result).toEqual([[expectedResult]]);
	});

	it('should route video/imageToVideo to video.imageToVideo.execute', async () => {
		const expectedResult: INodeExecutionData = {
			json: { videoUrl: 'https://example.com/video.mp4' },
			pairedItem: 0,
		};
		(video.imageToVideo.execute as jest.Mock).mockResolvedValue([expectedResult]);
		mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'resource') return 'video';
			if (param === 'operation') return 'imageToVideo';
			return undefined;
		});

		const result = await router.call(mockExecuteFunctions);

		expect(video.imageToVideo.execute).toHaveBeenCalledTimes(1);
		expect(result).toEqual([[expectedResult]]);
	});

	it('should route audio/textToSpeech to audio.textToSpeech.execute', async () => {
		const expectedResult: INodeExecutionData = {
			json: { audioLength: 5 },
			pairedItem: 0,
		};
		(audio.textToSpeech.execute as jest.Mock).mockResolvedValue([expectedResult]);
		mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'resource') return 'audio';
			if (param === 'operation') return 'textToSpeech';
			return undefined;
		});

		const result = await router.call(mockExecuteFunctions);

		expect(audio.textToSpeech.execute).toHaveBeenCalledTimes(1);
		expect(result).toEqual([[expectedResult]]);
	});

	it('should throw NodeOperationError for unsupported resource', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'resource') return 'unsupported';
			if (param === 'operation') return 'test';
			return undefined;
		});

		await expect(router.call(mockExecuteFunctions)).rejects.toThrow(NodeOperationError);
	});

	it('should return error in json when continueOnFail is enabled and operation throws', async () => {
		(text.message.execute as jest.Mock).mockRejectedValue(new Error('API limit reached'));
		mockExecuteFunctions.continueOnFail.mockReturnValue(true);
		mockExecuteFunctions.getNodeParameter.mockImplementation((param: string) => {
			if (param === 'resource') return 'text';
			if (param === 'operation') return 'message';
			return undefined;
		});

		const result = await router.call(mockExecuteFunctions);

		expect(result).toEqual([
			[
				{
					json: { error: 'API limit reached' },
					pairedItem: { item: 0 },
				},
			],
		]);
	});
});
