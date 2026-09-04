import * as upload from '../../../actions/file/upload.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as GenericFunctions from '../../../GenericFunctions';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';
import type { Mock } from 'vitest';

const baseNodeParameters = {
	resource: 'file',
	operation: 'upload',
	sessionId: 'test-session-123',
	windowId: 'window-123',
	fileName: 'test.pdf',
	fileType: 'customer_upload',
	source: 'url',
	url: 'https://example.com/file.pdf',
	triggerFileInputParameter: true,
	elementDescription: 'test desc',
	includeHiddenElements: false,
};

const mockCreateFileResponse = {
	data: {
		id: 'file-123',
		uploadUrl: 'https://upload.example.com/url',
	},
};

const mockAvailableEvent = {
	event: 'file_upload_status',
	status: 'available',
	fileId: 'file-123',
};

vi.mock('../../../transport', async () => {
	const originalModule = await vi.importActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: vi.fn(),
	};
});

vi.mock('../../../GenericFunctions', async () => {
	const originalModule = await vi.importActual<typeof GenericFunctions>(
		'../../../GenericFunctions',
	);
	return {
		...originalModule,
		waitForSessionEvent: vi.fn(),
	};
});

describe('Test Airtop, upload file operation', () => {
	afterEach(() => {
		vi.clearAllMocks();
		vi.useRealTimers();
	});

	it('should upload a file from a URL and trigger the file input successfully', async () => {
		vi.useFakeTimers();

		const apiRequestMock = transport.apiRequest as Mock;
		apiRequestMock
			.mockResolvedValueOnce(mockCreateFileResponse)
			.mockResolvedValueOnce({ data: { status: 'available' } })
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({});

		(GenericFunctions.waitForSessionEvent as Mock).mockResolvedValueOnce(mockAvailableEvent);

		const mockExecuteFunction = createMockExecuteFunction(baseNodeParameters);
		const fileBuffer = Buffer.from('file-content');
		const httpRequestMock = vi.fn().mockResolvedValueOnce(fileBuffer).mockResolvedValueOnce({});
		mockExecuteFunction.helpers.httpRequest = httpRequestMock;

		const resultPromise = upload.execute.call(mockExecuteFunction, 0);
		await vi.runAllTimersAsync();
		const result = await resultPromise;

		// Fetch the file content from the URL, then PUT it to the upload URL
		expect(httpRequestMock).toHaveBeenNthCalledWith(1, {
			url: 'https://example.com/file.pdf',
			json: false,
			encoding: 'arraybuffer',
		});
		expect(httpRequestMock).toHaveBeenNthCalledWith(2, {
			method: 'PUT',
			url: 'https://upload.example.com/url',
			body: fileBuffer,
			headers: {
				'Content-Type': 'application/octet-stream',
			},
		});

		// Assert the exact outgoing apiRequest calls
		expect(apiRequestMock).toHaveBeenCalledTimes(4);
		expect(apiRequestMock).toHaveBeenNthCalledWith(1, 'POST', '/files', {
			fileName: 'test.pdf',
			fileType: 'customer_upload',
		});
		expect(apiRequestMock).toHaveBeenNthCalledWith(2, 'GET', '/files/file-123');
		expect(apiRequestMock).toHaveBeenNthCalledWith(3, 'POST', '/files/file-123/push', {
			sessionIds: ['test-session-123'],
		});
		expect(apiRequestMock).toHaveBeenNthCalledWith(
			4,
			'POST',
			'/sessions/test-session-123/windows/window-123/file-input',
			{
				fileId: 'file-123',
				elementDescription: 'test desc',
				includeHiddenElements: false,
			},
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'window-123',
					data: {
						fileId: 'file-123',
						message: 'File uploaded successfully',
					},
				},
			},
		]);
	});

	it('should not trigger the file input when triggerFileInputParameter is false', async () => {
		vi.useFakeTimers();

		const apiRequestMock = transport.apiRequest as Mock;
		apiRequestMock
			.mockResolvedValueOnce(mockCreateFileResponse)
			.mockResolvedValueOnce({ data: { status: 'available' } })
			.mockResolvedValueOnce({});

		(GenericFunctions.waitForSessionEvent as Mock).mockResolvedValueOnce(mockAvailableEvent);

		const nodeParameters = {
			...baseNodeParameters,
			triggerFileInputParameter: false,
		};
		const mockExecuteFunction = createMockExecuteFunction(nodeParameters);
		mockExecuteFunction.helpers.httpRequest = vi
			.fn()
			.mockResolvedValueOnce(Buffer.from('file-content'))
			.mockResolvedValueOnce({});

		const resultPromise = upload.execute.call(mockExecuteFunction, 0);
		await vi.runAllTimersAsync();
		const result = await resultPromise;

		// The file-input request must not be sent
		expect(apiRequestMock).toHaveBeenCalledTimes(3);
		expect(apiRequestMock).not.toHaveBeenCalledWith(
			'POST',
			'/sessions/test-session-123/windows/window-123/file-input',
			expect.anything(),
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'window-123',
					data: {
						fileId: 'file-123',
						message: 'File uploaded successfully',
					},
				},
			},
		]);
	});

	it('should upload a file from binary data', async () => {
		vi.useFakeTimers();

		const apiRequestMock = transport.apiRequest as Mock;
		apiRequestMock
			.mockResolvedValueOnce(mockCreateFileResponse)
			.mockResolvedValueOnce({ data: { status: 'available' } })
			.mockResolvedValueOnce({})
			.mockResolvedValueOnce({});

		(GenericFunctions.waitForSessionEvent as Mock).mockResolvedValueOnce(mockAvailableEvent);

		const nodeParameters = {
			...baseNodeParameters,
			source: 'binary',
			binaryPropertyName: 'data',
		};
		const mockExecuteFunction = createMockExecuteFunction(nodeParameters);
		const fileBuffer = Buffer.from('binary-content');
		const getBinaryDataBufferMock = vi.fn().mockResolvedValueOnce(fileBuffer);
		mockExecuteFunction.helpers.getBinaryDataBuffer = getBinaryDataBufferMock;
		const httpRequestMock = vi.fn().mockResolvedValueOnce({});
		mockExecuteFunction.helpers.httpRequest = httpRequestMock;

		const resultPromise = upload.execute.call(mockExecuteFunction, 0);
		await vi.runAllTimersAsync();
		const result = await resultPromise;

		// Binary data is read from the item, not fetched over HTTP
		expect(getBinaryDataBufferMock).toHaveBeenCalledWith(0, 'data');
		expect(httpRequestMock).toHaveBeenCalledTimes(1);
		expect(httpRequestMock).toHaveBeenCalledWith({
			method: 'PUT',
			url: 'https://upload.example.com/url',
			body: fileBuffer,
			headers: {
				'Content-Type': 'application/octet-stream',
			},
		});

		expect(apiRequestMock).toHaveBeenNthCalledWith(1, 'POST', '/files', {
			fileName: 'test.pdf',
			fileType: 'customer_upload',
		});

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'window-123',
					data: {
						fileId: 'file-123',
						message: 'File uploaded successfully',
					},
				},
			},
		]);
	});

	it('should throw error when sessionId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			sessionId: '',
		};

		await expect(upload.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.REQUIRED_PARAMETER.replace('{{field}}', 'Session ID'),
		);
	});

	it('should throw error when windowId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			windowId: '',
		};

		await expect(upload.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.REQUIRED_PARAMETER.replace('{{field}}', 'Window ID'),
		);
	});
});
