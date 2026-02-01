import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import * as binaryDataHelpers from '../../../../helpers/binary-data';
import type { VideoJob } from '../../../../helpers/interfaces';
import * as pollingHelpers from '../../../../helpers/polling';
import * as transport from '../../../../transport';
import { execute } from '../../../../v2/actions/video/generate.operation';
import FormData from 'form-data';

jest.mock('../../../../helpers/binary-data');
jest.mock('../../../../helpers/polling');
jest.mock('../../../../transport');

jest.mock('form-data', () => jest.fn());

const mockFormData = jest.mocked(FormData);

describe('Video Generate Operation', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockFormDataInstance: jest.Mocked<FormData>;
	const apiRequestSpy = jest.spyOn(transport, 'apiRequest');
	const getBinaryDataFileSpy = jest.spyOn(binaryDataHelpers, 'getBinaryDataFile');
	const pollUntilAvailableSpy = jest.spyOn(pollingHelpers, 'pollUntilAvailable');

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = mock<INode>({
			id: 'test-node',
			name: 'OpenAI Video Generate',
			type: 'n8n-nodes-base.openAi',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		});

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);

		mockExecuteFunctions.helpers.prepareBinaryData = jest.fn();
		mockExecuteFunctions.helpers.binaryToBuffer = jest.fn();

		mockFormDataInstance = {
			append: jest.fn(),
			getHeaders: jest.fn().mockReturnValue({ 'content-type': 'multipart/form-data' }),
		} as unknown as jest.Mocked<FormData>;
		mockFormData.mockImplementation(() => mockFormDataInstance);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('successful execution', () => {
		beforeEach(() => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'sora-2',
					prompt: 'A cat playing with a ball',
					seconds: 4,
					size: '1280x720',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});
		});

		it('should generate video with basic parameters', async () => {
			const mockVideoJob: VideoJob = {
				id: 'video-123',
				created_at: Date.now(),
				model: 'sora-2',
				object: 'video',
				seconds: '4',
				size: '1280x720',
				status: 'queued',
			};

			const mockCompletedJob: VideoJob = {
				...mockVideoJob,
				status: 'completed',
				completed_at: Date.now(),
			};

			const mockContentResponse = {
				headers: { 'content-type': 'video/mp4' },
				body: Buffer.from('mock-video-data'),
			};

			const mockBinaryData = {
				data: 'base64-encoded-video',
				mimeType: 'video/mp4',
				fileName: 'data',
			};

			apiRequestSpy.mockResolvedValueOnce(mockVideoJob).mockResolvedValueOnce(mockContentResponse);

			pollUntilAvailableSpy.mockResolvedValue(mockCompletedJob);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(apiRequestSpy).toHaveBeenCalledTimes(2);
			expect(apiRequestSpy).toHaveBeenNthCalledWith(1, 'POST', '/videos', {
				option: { formData: expect.any(Object) },
				headers: expect.any(Object),
			});
			expect(apiRequestSpy).toHaveBeenNthCalledWith(2, 'GET', '/videos/video-123/content', {
				option: {
					useStream: true,
					resolveWithFullResponse: true,
					json: false,
					encoding: null,
				},
			});

			expect(pollUntilAvailableSpy).toHaveBeenCalledWith(
				mockExecuteFunctions,
				expect.any(Function),
				expect.any(Function),
				300,
				10,
			);

			expect(result).toEqual([
				{
					json: {
						data: undefined,
						mimeType: 'video/mp4',
						fileName: 'data',
					},
					binary: {
						data: mockBinaryData,
					},
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should generate video with custom options', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'sora-2',
					prompt: 'A beautiful sunset over mountains',
					seconds: 8,
					size: '1792x1024',
					options: {
						waitTime: 600,
						fileName: 'sunset_video',
					},
				};
				return params[paramName as keyof typeof params];
			});

			const mockVideoJob: VideoJob = {
				id: 'video-456',
				created_at: Date.now(),
				model: 'sora-2',
				object: 'video',
				seconds: '8',
				size: '1792x1024',
				status: 'completed',
				completed_at: Date.now(),
			};

			const mockContentResponse = {
				headers: { 'content-type': 'video/mp4' },
				body: Buffer.from('mock-video-data'),
			};

			const mockBinaryData = {
				data: 'base64-encoded-video',
				mimeType: 'video/mp4',
				fileName: 'sunset_video',
			};

			apiRequestSpy.mockResolvedValueOnce(mockVideoJob).mockResolvedValueOnce(mockContentResponse);

			pollUntilAvailableSpy.mockResolvedValue(mockVideoJob);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(pollUntilAvailableSpy).toHaveBeenCalledWith(
				mockExecuteFunctions,
				expect.any(Function),
				expect.any(Function),
				600,
				10,
			);

			expect(mockExecuteFunctions.helpers.prepareBinaryData).toHaveBeenCalledWith(
				mockContentResponse.body,
				'sunset_video',
				'video/mp4',
			);

			expect(result[0].json.fileName).toBe('sunset_video');
		});

		it('should generate video with binary reference image', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'sora-2',
					prompt: 'Continue this scene with motion',
					seconds: 6,
					size: '1280x720',
					options: {
						binaryPropertyNameReference: 'reference_image',
					},
				};
				return params[paramName as keyof typeof params];
			});

			const mockBinaryFile = {
				fileContent: Buffer.from('mock-image-data'),
				contentType: 'image/jpeg',
				filename: 'reference.jpg',
			};

			const mockVideoJob: VideoJob = {
				id: 'video-789',
				created_at: Date.now(),
				model: 'sora-2',
				object: 'video',
				seconds: '6',
				size: '1280x720',
				status: 'completed',
			};

			const mockContentResponse = {
				headers: { 'content-type': 'video/mp4' },
				body: Buffer.from('mock-video-data'),
			};

			const mockBinaryData = {
				data: 'base64-encoded-video',
				mimeType: 'video/mp4',
				fileName: 'data',
			};

			getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
			(mockExecuteFunctions.helpers.binaryToBuffer as jest.Mock).mockResolvedValue(
				mockBinaryFile.fileContent,
			);
			apiRequestSpy.mockResolvedValueOnce(mockVideoJob).mockResolvedValueOnce(mockContentResponse);
			pollUntilAvailableSpy.mockResolvedValue(mockVideoJob);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(getBinaryDataFileSpy).toHaveBeenCalledWith(mockExecuteFunctions, 0, 'reference_image');
			expect(mockExecuteFunctions.helpers.binaryToBuffer).toHaveBeenCalledWith(
				mockBinaryFile.fileContent,
			);

			expect(result).toHaveLength(1);
			expect(result[0].binary?.data).toBe(mockBinaryData);
		});
	});

	describe('FormData handling', () => {
		beforeEach(() => {
			jest.clearAllMocks();
		});

		it('should create FormData with correct parameters', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'sora-2',
					prompt: 'Test video generation',
					seconds: 6,
					size: '1024x1792',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockVideoJob: VideoJob = {
				id: 'video-formdata',
				created_at: Date.now(),
				model: 'sora-2',
				object: 'video',
				seconds: '6',
				size: '1024x1792',
				status: 'completed',
			};

			const mockContentResponse = {
				headers: { 'content-type': 'video/mp4' },
				body: Buffer.from('mock-video-data'),
			};

			const mockBinaryData = {
				data: 'base64-encoded-video',
				mimeType: 'video/mp4',
				fileName: 'data',
			};

			apiRequestSpy.mockResolvedValueOnce(mockVideoJob).mockResolvedValueOnce(mockContentResponse);

			pollUntilAvailableSpy.mockResolvedValue(mockVideoJob);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			await execute.call(mockExecuteFunctions, 0);

			expect(mockFormDataInstance.append).toHaveBeenCalledWith('model', 'sora-2');
			expect(mockFormDataInstance.append).toHaveBeenCalledWith('prompt', 'Test video generation');
			expect(mockFormDataInstance.append).toHaveBeenCalledWith('seconds', '6');
			expect(mockFormDataInstance.append).toHaveBeenCalledWith('size', '1024x1792');
			expect(mockFormDataInstance.getHeaders).toHaveBeenCalled();
		});

		it('should append binary reference when provided', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'sora-2',
					prompt: 'Test with reference',
					seconds: 4,
					size: '1280x720',
					options: {
						binaryPropertyNameReference: 'reference',
					},
				};
				return params[paramName as keyof typeof params];
			});

			const mockBinaryFile = {
				fileContent: Buffer.from('mock-image-data'),
				contentType: 'image/png',
				filename: 'reference.png',
			};

			const mockVideoJob: VideoJob = {
				id: 'video-with-ref',
				created_at: Date.now(),
				model: 'sora-2',
				object: 'video',
				seconds: '4',
				size: '1280x720',
				status: 'completed',
			};

			const mockContentResponse = {
				headers: { 'content-type': 'video/mp4' },
				body: Buffer.from('mock-video-data'),
			};

			const mockBinaryData = {
				data: 'base64-encoded-video',
				mimeType: 'video/mp4',
				fileName: 'data',
			};

			getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
			(mockExecuteFunctions.helpers.binaryToBuffer as jest.Mock).mockResolvedValue(
				mockBinaryFile.fileContent,
			);
			apiRequestSpy.mockResolvedValueOnce(mockVideoJob).mockResolvedValueOnce(mockContentResponse);
			pollUntilAvailableSpy.mockResolvedValue(mockVideoJob);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			await execute.call(mockExecuteFunctions, 0);

			expect(mockFormDataInstance.append).toHaveBeenCalledWith(
				'input_reference',
				mockBinaryFile.fileContent,
				{
					filename: 'reference.png',
					contentType: 'image/png',
				},
			);
		});
	});

	describe('binary data processing', () => {
		it('should process video content with correct MIME type', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'sora-2',
					prompt: 'Test MIME type',
					seconds: 4,
					size: '1280x720',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockVideoJob: VideoJob = {
				id: 'video-mime',
				created_at: Date.now(),
				model: 'sora-2',
				object: 'video',
				seconds: '4',
				size: '1280x720',
				status: 'completed',
			};

			const mockContentResponse = {
				headers: { 'content-type': 'video/webm' },
				body: Buffer.from('mock-webm-video-data'),
			};

			const mockBinaryData = {
				data: 'base64-encoded-webm-video',
				mimeType: 'video/webm',
				fileName: 'data',
			};

			apiRequestSpy.mockResolvedValueOnce(mockVideoJob).mockResolvedValueOnce(mockContentResponse);

			pollUntilAvailableSpy.mockResolvedValue(mockVideoJob);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(mockExecuteFunctions.helpers.prepareBinaryData).toHaveBeenCalledWith(
				mockContentResponse.body,
				'data',
				'video/webm',
			);

			expect(result[0].json.mimeType).toBe('video/webm');
		});

		it('should handle missing content-type header', async () => {
			mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
				const params = {
					modelId: 'sora-2',
					prompt: 'Test no MIME type',
					seconds: 4,
					size: '1280x720',
					options: {},
				};
				return params[paramName as keyof typeof params];
			});

			const mockVideoJob: VideoJob = {
				id: 'video-no-mime',
				created_at: Date.now(),
				model: 'sora-2',
				object: 'video',
				seconds: '4',
				size: '1280x720',
				status: 'completed',
			};

			const mockContentResponse = {
				headers: {},
				body: Buffer.from('mock-video-data'),
			};

			const mockBinaryData = {
				data: 'base64-encoded-video',
				mimeType: undefined,
				fileName: 'data',
			};

			apiRequestSpy.mockResolvedValueOnce(mockVideoJob).mockResolvedValueOnce(mockContentResponse);

			pollUntilAvailableSpy.mockResolvedValue(mockVideoJob);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(
				mockBinaryData,
			);

			const result = await execute.call(mockExecuteFunctions, 0);

			expect(mockExecuteFunctions.helpers.prepareBinaryData).toHaveBeenCalledWith(
				mockContentResponse.body,
				'data',
				undefined,
			);

			expect(result[0].json.mimeType).toBeUndefined();
		});
	});
});
