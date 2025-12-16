import * as getMany from '../../../actions/file/getMany.operation';
import * as transport from '../../../transport';
import { createMockExecuteFunction } from '../helpers';

const baseNodeParameters = {
	resource: 'file',
	operation: 'getMany',
	sessionId: 'test-session-123',
	returnAll: true,
	outputSingleItem: true,
};

const mockFilesResponse = {
	data: {
		files: [
			{
				id: 'file-123',
				name: 'document1.pdf',
				size: 12345,
				contentType: 'application/pdf',
				createdAt: '2023-06-15T10:30:00Z',
			},
			{
				id: 'file-456',
				name: 'image1.jpg',
				size: 54321,
				contentType: 'image/jpeg',
				createdAt: '2023-06-16T11:45:00Z',
			},
		],
		pagination: {
			hasMore: false,
		},
	},
};

const mockPaginatedResponse = {
	data: {
		files: [mockFilesResponse.data.files[0]],
		pagination: {
			hasMore: true,
		},
	},
};

jest.mock('../../../transport', () => {
	const originalModule = jest.requireActual<typeof transport>('../../../transport');
	return {
		...originalModule,
		apiRequest: jest.fn(),
	};
});

describe('Test Airtop, get many files operation', () => {
	afterAll(() => {
		jest.unmock('../../../transport');
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	it('should get all files successfully', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce(mockFilesResponse);

		const result = await getMany.execute.call(createMockExecuteFunction(baseNodeParameters), 0);

		expect(apiRequestMock).toHaveBeenCalledWith(
			'GET',
			'/files',
			{},
			{
				limit: 100,
				offset: 0,
				sessionIds: '',
			},
		);

		expect(result).toEqual([
			{
				json: {
					...mockFilesResponse,
				},
			},
		]);
	});

	it('should handle limited results', async () => {
		const apiRequestMock = transport.apiRequest as jest.Mock;
		apiRequestMock.mockResolvedValueOnce(mockPaginatedResponse);

		const nodeParameters = {
			...baseNodeParameters,
			returnAll: false,
			limit: 1,
		};

		const result = await getMany.execute.call(createMockExecuteFunction(nodeParameters), 0);

		expect(apiRequestMock).toHaveBeenCalledWith(
			'GET',
			'/files',
			{},
			{
				limit: 1,
				sessionIds: '',
			},
		);

		expect(result).toEqual([
			{
				json: {
					...mockPaginatedResponse,
				},
			},
		]);
	});
});
