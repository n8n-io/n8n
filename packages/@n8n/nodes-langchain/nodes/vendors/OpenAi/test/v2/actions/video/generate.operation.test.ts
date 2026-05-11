import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import * as binaryDataHelpers from '../../../../helpers/binary-data';
import type { VideoJob } from '../../../../helpers/interfaces';
import * as pollingHelpers from '../../../../helpers/polling';
import * as transport from '../../../../transport';
import { execute } from '../../../../v2/actions/video/generate.operation';

const { mockFormDataAppend, mockFormDataGetHeaders } = vi.hoisted(() => ({
	mockFormDataAppend: vi.fn(),
	mockFormDataGetHeaders: vi.fn(),
}));

vi.mock('form-data', () => {
	class MockFormData {
		append = mockFormDataAppend;
		getHeaders = mockFormDataGetHeaders;
	}
	return { default: MockFormData };
});

vi.mock('../../../../helpers/binary-data');
vi.mock('../../../../helpers/polling');
vi.mock('../../../../transport');

describe('Video Generate Operation', async () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	const apiRequestSpy = vi.spyOn(transport, 'apiRequest');
	const getBinaryDataFileSpy = vi.spyOn(binaryDataHelpers, 'getBinaryDataFile');
	const pollUntilAvailableSpy = vi.spyOn(pollingHelpers, 'pollUntilAvailable');

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

		mockExecuteFunctions.helpers.prepareBinaryData = vi.fn();
		mockExecuteFunctions.helpers.binaryToBuffer = vi.fn();
		mockFormDataGetHeaders.mockReturnValue({ 'content-type': 'multipart/form-data' });
	});

	afterEach(() => {
		vi.resetAllMocks();
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
			(mockExecuteFunctions.helpers.prepareBinaryData as Mock).mockResolvedValue(mockBinaryData);

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
			(mockExecuteFunctions.helpers.prepareBinaryData as Mock).mockResolvedValue(mockBinaryData);

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
			(mockExecuteFunctions.helpers.binaryToBuffer as Mock).mockResolvedValue(
				mockBinaryFile.fileContent,
			);
			apiRequestSpy.mockResolvedValueOnce(mockVideoJob).mockResolvedValueOnce(mockContentResponse);
			pollUntilAvailableSpy.mockResolvedValue(mockVideoJob);
			(mockExecuteFunctions.helpers.prepareBinaryData as Mock).mockResolvedValue(mockBinaryData);

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
			vi.clearAllMocks();
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
			(mockExecuteFunctions.helpers.prepareBinaryData as Mock).mockResolvedValue(mockBinaryData);

			await execute.call(mockExecuteFunctions, 0);

			expect(mockFormDataAppend).toHaveBeenCalledWith('model', 'sora-2');
			expect(mockFormDataAppend).toHaveBeenCalledWith('prompt', 'Test video generation');
			expect(mockFormDataAppend).toHaveBeenCalledWith('seconds', '6');
			expect(mockFormDataAppend).toHaveBeenCalledWith('size', '1024x1792');
			expect(mockFormDataGetHeaders).toHaveBeenCalled();
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
			(mockExecuteFunctions.helpers.binaryToBuffer as Mock).mockResolvedValue(
				mockBinaryFile.fileContent,
			);
			apiRequestSpy.mockResolvedValueOnce(mockVideoJob).mockResolvedValueOnce(mockContentResponse);
			pollUntilAvailableSpy.mockResolvedValue(mockVideoJob);
			(mockExecuteFunctions.helpers.prepareBinaryData as Mock).mockResolvedValue(mockBinaryData);

			await execute.call(mockExecuteFunctions, 0);

			expect(mockFormDataAppend).toHaveBeenCalledWith(
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
			(mockExecuteFunctions.helpers.prepareBinaryData as Mock).mockResolvedValue(mockBinaryData);

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
			(mockExecuteFunctions.helpers.prepareBinaryData as Mock).mockResolvedValue(mockBinaryData);

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
