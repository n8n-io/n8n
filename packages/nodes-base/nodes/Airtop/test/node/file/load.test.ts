import * as load from '../../../actions/file/load.operation';
import * as GenericFunctions from '../../../GenericFunctions';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';
import type { Mock } from 'vitest';

const baseNodeParameters = {
	resource: 'file',
	operation: 'load',
	sessionId: 'test-session-123',
	windowId: 'test-window-123',
	fileId: 'file-123',
	elementDescription: 'the file upload box',
	includeHiddenElements: true,
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

describe('Test Airtop, load file operation', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should load file into session successfully', async () => {
		const apiRequestMock = transport.apiRequest as Mock;
		apiRequestMock.mockResolvedValue({});
		(GenericFunctions.waitForSessionEvent as Mock).mockResolvedValueOnce(mockAvailableEvent);

		const result = await load.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

		expect(apiRequestMock).toHaveBeenCalledTimes(2);
		expect(apiRequestMock).toHaveBeenNthCalledWith(1, 'POST', '/files/file-123/push', {
			sessionIds: ['test-session-123'],
		});
		expect(apiRequestMock).toHaveBeenNthCalledWith(
			2,
			'POST',
			'/sessions/test-session-123/windows/test-window-123/file-input',
			{
				fileId: 'file-123',
				elementDescription: 'the file upload box',
				includeHiddenElements: true,
			},
		);

		expect(GenericFunctions.waitForSessionEvent).toHaveBeenCalledWith(
			'test-session-123',
			expect.any(Function),
			expect.any(Number),
		);

		expect(result).toEqual([
			{
				json: {
					sessionId: 'test-session-123',
					windowId: 'test-window-123',
					data: {
						message: 'File loaded successfully',
					},
				},
			},
		]);
	});

	it('should send default file-input options when none are provided', async () => {
		const apiRequestMock = transport.apiRequest as Mock;
		apiRequestMock.mockResolvedValue({});
		(GenericFunctions.waitForSessionEvent as Mock).mockResolvedValueOnce(mockAvailableEvent);

		const nodeParameters = {
			resource: 'file',
			operation: 'load',
			sessionId: 'test-session-123',
			windowId: 'test-window-123',
			fileId: 'file-123',
		};

		await load.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(apiRequestMock).toHaveBeenNthCalledWith(
			2,
			'POST',
			'/sessions/test-session-123/windows/test-window-123/file-input',
			{
				fileId: 'file-123',
				elementDescription: '',
				includeHiddenElements: false,
			},
		);
	});

	it('should throw a NodeOperationError when the upload fails', async () => {
		const apiRequestMock = transport.apiRequest as Mock;
		apiRequestMock.mockResolvedValue({});
		(GenericFunctions.waitForSessionEvent as Mock).mockRejectedValueOnce(
			new Error('Upload failed for File ID: file-123'),
		);

		await expect(
			load.execute.call(createMockExecuteFunction(baseNodeParameters), 0),
		).rejects.toThrow('Upload failed for File ID: file-123');

		// the file input should never be triggered when the push fails
		expect(apiRequestMock).toHaveBeenCalledTimes(1);
		expect(apiRequestMock).toHaveBeenCalledWith('POST', '/files/file-123/push', {
			sessionIds: ['test-session-123'],
		});
	});
});
