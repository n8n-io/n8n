import { requestPath } from 'n8n-workflow';
import * as get from '../../../actions/file/get.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

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

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(),
	};
});

describe('Test Airtop, get file operation', () => {
	afterAll(() => {
		jest.unmock('../../../transport');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should get file details successfully', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce(mockFileResponse);

		const result = await get.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

		expect(apiRequestMock).toHaveBeenCalledWith('GET', requestPath`/files/file-123`);

		expect(result).toEqual([
			{
				json: {
					...mockFileResponse,
				},
			},
		]);
	});

	it('should encode a file ID that contains a slash', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce(mockFileResponse);

		await get.execute.call(
			createMockExecuteFunction({ ...baseNodeParameters, fileId: 'file-123/sessions' }),
			0,
		);

		expect(String(apiRequestMock.mock.calls[0][1])).toBe('/files/file-123%2Fsessions');
	});

	it('should reject a file ID that is a dot segment', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;

		await expect(
			get.execute.call(createMockExecuteFunction({ ...baseNodeParameters, fileId: '../x' }), 0),
		).rejects.toThrow('Invalid identifier');

		expect(apiRequestMock).not.toHaveBeenCalled();
	});

	it('should output file with binary data when specified', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce(mockFileResponse);

		const nodeParameters = {
			...baseNodeParameters,
			outputBinaryFile: true,
		};

		const mockExecuteFunction = createMockExecuteFunction(nodeParameters);

		mockExecuteFunction.helpers.httpRequest = jest.fn().mockResolvedValue(mockBinaryBuffer);
		mockExecuteFunction.helpers.prepareBinaryData = jest
			.fn()
			.mockResolvedValue(mockPreparedBinaryData);

		const result = await get.execute.call(mockExecuteFunction, 0);

		expect(apiRequestMock).toHaveBeenCalledWith('GET', requestPath`/files/file-123`);

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
