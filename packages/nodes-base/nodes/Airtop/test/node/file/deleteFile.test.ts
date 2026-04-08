import * as deleteFile from '../../../actions/file/delete.operation';
import { ERROR_MESSAGES } from '../../../constants';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'file',
	operation: 'deleteFile',
	sessionId: 'test-session-123',
	fileId: 'file-123',
};

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn().mockResolvedValue({}),
	};
});

describe('Test Airtop, delete file operation', () => {
	afterAll(() => {
		jest.unmock('../../../transport');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should delete file successfully', async () => {
		const result = await deleteFile.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

		expect(transport.apiRequest).toHaveBeenCalledWith('DELETE', '/files/file-123');
		expect(result).toEqual([
			{
				json: {
					data: {
						message: 'File deleted successfully',
					},
				},
			},
		]);
	});

	it('should throw error when fileId is empty', async () => {
		const nodeParameters = {
			...baseNodeParameters,
			fileId: '',
		};

		await expect(
			deleteFile.execute.call(createMockExecuteFunction(nodeParameters), 0),
		).rejects.toThrow(ERROR_MESSAGES.REQUIRED_PARAMETER.replace('{{field}}', 'File ID'));
	});
});
