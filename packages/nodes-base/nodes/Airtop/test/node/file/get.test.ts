import * as get from '../../../actions/file/get.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';
import type { Mock } from 'vitest';

const baseNodeParameters = {
	resource: 'file',
	operation: 'get',
	sessionId: 'test-session-123',
	fileId: 'file-123',
};

const mockFileResponse = {
	data: {
		id: 'file-123',
		fileName: 'test-file.pdf',
		status: 'available',
		downloadUrl: 'https://api.airtop.com/files/file-123/download',
	},
};

const mockBinaryBuffer = Buffer.from('mock-binary-data');

const mockPreparedBinaryData = {
	mimeType: 'application/pdf',
	fileType: 'pdf',
	fileName: 'test-file.pdf',
	data: 'mock-base64-data',
};

vi.mock('../../../transport', async () => {
	const originalModule = await vi.importActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: vi.fn(),
	};
});

describe('Test Airtop, get file operation', () => {
	afterEach(() => {
		vi.clearAllMocks();
	});

	it('should get file details successfully', async () => {
		const apiRequestMock = transport.apiRequest as Mock;
		apiRequestMock.mockResolvedValueOnce(mockFileResponse);

		const result = await get.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

		expect(apiRequestMock).toHaveBeenCalledWith('GET', '/files/file-123');

		expect(result).toEqual([
			{
				json: {
					...mockFileResponse,
				},
			},
		]);
	});

	it('should output file with binary data when specified', async () => {
		const apiRequestMock = transport.apiRequest as Mock;
		apiRequestMock.mockResolvedValueOnce(mockFileResponse);

		const nodeParameters = {
			...baseNodeParameters,
			outputBinaryFile: true,
		};

		const mockExecuteFunction = createMockExecuteFunction(nodeParameters);

		mockExecuteFunction.helpers.httpRequest = vi.fn().mockResolvedValue(mockBinaryBuffer);
		mockExecuteFunction.helpers.prepareBinaryData = vi
			.fn()
			.mockResolvedValue(mockPreparedBinaryData);

		const result = await get.execute.call(mockExecuteFunction, 0);

		expect(apiRequestMock).toHaveBeenCalledWith('GET', '/files/file-123');

		expect(result).toEqual([
			{
				json: {
					...mockFileResponse,
				},
				binary: { data: mockPreparedBinaryData },
			},
		]);
	});

	it('should throw error when fileId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			fileId: '',
		};

		await expect(get.execute.call(createMockExecuteFunction(nodeParameters), 0)).rejects.toThrow(
			ERROR_MESSAGES.REQUIRED_PARAMETER.replace('{{field}}', 'File ID'),
		);
	});
});
