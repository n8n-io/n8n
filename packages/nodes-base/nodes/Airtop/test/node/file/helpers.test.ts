import * as helpers from '../../../actions/file/helpers';
import { BASE_URL } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const mockFileCreateResponse = {
	data: {
		id: 'file-123',
		uploadUrl: 'https://upload.example.com/url',
	},
};

// Mock the transport and other dependencies
jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(async () => {}),
	};
});

describe('Test Airtop file helpers', () => {
	afterAll(() => {
		jest.unmock('../../../transport');
	});

	afterEach(() => {
		jest.clearAllMocks();
		(transport.apiRequest as jest.Mock).mockReset();
	});

	describe('requestAllFiles', () => {
		it('should request all files with pagination', async () => {
			const apiRequestMock = transport.apiRequest as jest.Mock;
			const mockFilesResponse1 = {
				data: {
					files: [{ id: 'file-1' }, { id: 'file-2' }],
					pagination: { hasMore: true },
				},
			};

			const mockFilesResponse2 = {
				data: {
					files: [{ id: 'file-3' }],
					pagination: { hasMore: false },
				},
			};

			apiRequestMock
				.mockResolvedValueOnce(mockFilesResponse1)
				.mockResolvedValueOnce(mockFilesResponse2);

			const result = await helpers.requestAllFiles.call(
				createMockExecuteFunction({}),
				'session-123',
			);

			expect(apiRequestMock).toHaveBeenCalledTimes(2);
			expect(apiRequestMock).toHaveBeenNthCalledWith(
				1,
				'GET',
				'/files',
				{},
				{ offset: 0, limit: 100, sessionIds: 'session-123' },
			);
			expect(apiRequestMock).toHaveBeenNthCalledWith(
				2,
				'GET',
				'/files',
				{},
				{ offset: 100, limit: 100, sessionIds: 'session-123' },
			);

			expect(result).toEqual({
				data: {
					files: [{ id: 'file-1' }, { id: 'file-2' }, { id: 'file-3' }],
					pagination: { hasMore: false },
				},
			});
		});

		it('should handle empty response', async () => {
			const apiRequestMock = transport.apiRequest as jest.Mock;
			const mockEmptyResponse = {
				data: {
					files: [],
					pagination: { hasMore: false },
				},
			};

			apiRequestMock.mockResolvedValueOnce(mockEmptyResponse);

			const result = await helpers.requestAllFiles.call(
				createMockExecuteFunction({}),
				'session-123',
			);

			expect(apiRequestMock).toHaveBeenCalledTimes(1);
			expect(result).toEqual({
				data: {
					files: [],
					pagination: { hasMore: false },
				},
			});
		});
	});

	describe('pollFileUntilAvailable', () => {
		it('should poll until file is available', async () => {
			const apiRequestMock = transport.apiRequest as jest.Mock;
			apiRequestMock
				.mockResolvedValueOnce({ data: { status: 'uploading' } })
				.mockResolvedValueOnce({ data: { status: 'available' } });

			const pollPromise = helpers.pollFileUntilAvailable.call(
				createMockExecuteFunction({}),
				'file-123',
				1000,
				0,
			);

			const result = await pollPromise;

			expect(apiRequestMock).toHaveBeenCalledTimes(2);
			expect(apiRequestMock).toHaveBeenCalledWith('GET', '/files/file-123');
			expect(result).toBe('file-123');
		});

		it('should throw timeout error if file never becomes available', async () => {
			const apiRequestMock = transport.apiRequest as jest.Mock;
			apiRequestMock.mockResolvedValue({ data: { status: 'processing' } });

			const promise = helpers.pollFileUntilAvailable.call(
				createMockExecuteFunction({}),
				'file-123',
				0,
			);

			await expect(promise).rejects.toThrow();
		});
	});

	describe('createAndUploadFile', () => {
		it('should create file entry, upload file, and poll until available', async () => {
			const apiRequestMock = transport.apiRequest as jest.Mock;
			apiRequestMock
				.mockResolvedValueOnce(mockFileCreateResponse)
				.mockResolvedValueOnce({ data: { status: 'available' } });

			const mockExecuteFunction = createMockExecuteFunction({});
			const mockHttpRequest = jest.fn().mockResolvedValueOnce({});
			mockExecuteFunction.helpers.httpRequest = mockHttpRequest;
			const pollingFunctionMock = jest.fn().mockResolvedValueOnce(mockFileCreateResponse.data.id);

			const result = await helpers.createAndUploadFile.call(
				mockExecuteFunction,
				'test.png',
				Buffer.from('test'),
				'customer_upload',
				pollingFunctionMock,
			);

			expect(apiRequestMock).toHaveBeenCalledWith('POST', '/files', {
				fileName: 'test.png',
				fileType: 'customer_upload',
			});

			expect(mockHttpRequest).toHaveBeenCalledWith({
				method: 'PUT',
				url: mockFileCreateResponse.data.uploadUrl,
				body: Buffer.from('test'),
				headers: {
					'Content-Type': 'application/octet-stream',
				},
			});

			expect(pollingFunctionMock).toHaveBeenCalledWith(mockFileCreateResponse.data.id);

			expect(result).toBe(mockFileCreateResponse.data.id);
		});

		it('should throw error if file creation response is missing id or upload URL', async () => {
			const apiRequestMock = transport.apiRequest as jest.Mock;
			apiRequestMock.mockResolvedValueOnce({});

			await expect(
				helpers.createAndUploadFile.call(
					createMockExecuteFunction({}),
					'test.pdf',
					Buffer.from('test'),
					'customer_upload',
				),
			).rejects.toThrow();
		});
	});

	describe('waitForFileInSession', () => {
		it('should resolve when file is available in session', async () => {
			const apiRequestMock = transport.apiRequest as jest.Mock;
			apiRequestMock.mockResolvedValueOnce({
				data: {
					sessionIds: ['session-123', 'other-session'],
				},
			});

			const mockExecuteFunction = createMockExecuteFunction({});

			await helpers.waitForFileInSession.call(mockExecuteFunction, 'session-123', 'file-123', 1000);

			expect(apiRequestMock).toHaveBeenCalledTimes(1);
			expect(apiRequestMock).toHaveBeenCalledWith('GET', `${BASE_URL}/files/file-123`);
		});

		it('should timeout if file never becomes available in session', async () => {
			const apiRequestMock = transport.apiRequest as jest.Mock;

			// Mock to always return file not in session
			apiRequestMock.mockResolvedValue({
				data: {
					sessionIds: ['other-session'],
				},
			});

			const mockExecuteFunction = createMockExecuteFunction({});

			const waitPromise = helpers.waitForFileInSession.call(
				mockExecuteFunction,
				'session-123',
				'file-123',
				100,
			);

			await expect(waitPromise).rejects.toThrow();
		});

		it('should resolve immediately if file is already in session', async () => {
			const apiRequestMock = transport.apiRequest as jest.Mock;

			// Mock to return file already in session
			apiRequestMock.mockResolvedValueOnce({
				data: {
					sessionIds: ['session-123', 'other-session'],
				},
			});

			const mockExecuteFunction = createMockExecuteFunction({});

			await helpers.waitForFileInSession.call(mockExecuteFunction, 'session-123', 'file-123', 1000);

			expect(apiRequestMock).toHaveBeenCalledTimes(1);
			expect(apiRequestMock).toHaveBeenCalledWith('GET', `${BASE_URL}/files/file-123`);
		});
	});

	describe('pushFileToSession', () => {
		it('should push file to session and wait', async () => {
			const apiRequestMock = transport.apiRequest as jest.Mock;
			const mockFileId = 'file-123';
			const mockSessionId = 'session-123';
			apiRequestMock.mockResolvedValueOnce({});

			// Mock waitForFileInSession
			const waitForFileInSessionMock = jest.fn().mockResolvedValueOnce({});

			// Call the function
			await helpers.pushFileToSession.call(
				createMockExecuteFunction({}),
				mockFileId,
				mockSessionId,
				waitForFileInSessionMock,
			);

			expect(apiRequestMock).toHaveBeenCalledWith('POST', `/files/${mockFileId}/push`, {
				sessionIds: [mockSessionId],
			});

			expect(waitForFileInSessionMock).toHaveBeenCalledWith(mockSessionId, mockFileId);
		});
	});

	describe('triggerFileInput', () => {
		it('should trigger file input in window', async () => {
			const apiRequestMock = transport.apiRequest as jest.Mock;
			apiRequestMock.mockResolvedValueOnce({});
			const mockFileId = 'file-123';
			const mockWindowId = 'window-123';
			const mockSessionId = 'session-123';

			await helpers.triggerFileInput.call(createMockExecuteFunction({}), {
				fileId: mockFileId,
				windowId: mockWindowId,
				sessionId: mockSessionId,
				elementDescription: 'test',
				includeHiddenElements: false,
			});

			expect(apiRequestMock).toHaveBeenCalledWith(
				'POST',
				`/sessions/${mockSessionId}/windows/${mockWindowId}/file-input`,
				{
					fileId: mockFileId,
					elementDescription: 'test',
					includeHiddenElements: false,
				},
			);
		});
	});

	describe('createFileBuffer', () => {
		it('should create buffer from URL', async () => {
			const mockUrl = 'https://example.com/file.pdf';
			const mockBuffer = [1, 2, 3];

			// Mock http request
			const mockHttpRequest = jest.fn().mockResolvedValueOnce(mockBuffer);

			// Create mock execute function with http request helper
			const mockExecuteFunction = createMockExecuteFunction({});
			mockExecuteFunction.helpers.httpRequest = mockHttpRequest;

			const result = await helpers.createFileBuffer.call(mockExecuteFunction, 'url', mockUrl, 0);

			expect(mockHttpRequest).toHaveBeenCalledWith({
				url: mockUrl,
				json: false,
				encoding: 'arraybuffer',
			});
			expect(result).toBe(mockBuffer);
		});

		it('should create buffer from binary data', async () => {
			const mockBinaryPropertyName = 'data';
			const mockBuffer = [1, 2, 3];

			// Mock getBinaryDataBuffer
			const mockGetBinaryDataBuffer = jest.fn().mockResolvedValue(mockBuffer);

			// Create mock execute function with getBinaryDataBuffer helper
			const mockExecuteFunction = createMockExecuteFunction({});
			mockExecuteFunction.helpers.getBinaryDataBuffer = mockGetBinaryDataBuffer;

			const result = await helpers.createFileBuffer.call(
				mockExecuteFunction,
				'binary',
				mockBinaryPropertyName,
				0,
			);

			expect(mockGetBinaryDataBuffer).toHaveBeenCalledWith(0, mockBinaryPropertyName);
			expect(result).toBe(mockBuffer);
		});

		it('should throw error for unsupported source type', async () => {
			await expect(
				helpers.createFileBuffer.call(
					createMockExecuteFunction({}),
					'invalid-source',
					'test-value',
					0,
				),
			).rejects.toThrow();
		});
	});
});
