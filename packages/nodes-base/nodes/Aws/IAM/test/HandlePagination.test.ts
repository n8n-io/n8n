import { handlePagination } from '../GenericFunctions';

describe('handlePagination', () => {
	let mockContext: any;
	let mockMakeRoutingRequest: jest.Mock;
	let mockGetNodeParameter: jest.Mock;
	let resultOptions: any;

	beforeEach(() => {
		mockMakeRoutingRequest = jest.fn();
		mockGetNodeParameter = jest.fn();
		mockContext = {
			makeRoutingRequest: mockMakeRoutingRequest,
			getNodeParameter: mockGetNodeParameter,
		};

		resultOptions = {
			maxResults: 60,
			options: { body: {} },
		};
	});

	test('should stop fetching when the limit is reached and returnAll is false', async () => {
		mockMakeRoutingRequest.mockResolvedValueOnce({
			json: {
				Users: [{ id: 1 }, { id: 2 }, { id: 3 }],
				PaginationToken: undefined,
			},
		});

		mockGetNodeParameter.mockReturnValueOnce(false);
		mockGetNodeParameter.mockReturnValueOnce(2);

		const result = await handlePagination.call(mockContext, resultOptions);

		expect(mockMakeRoutingRequest).toHaveBeenCalledTimes(1);
		expect(result).toEqual([
			{
				json: {
					json: {
						Users: [{ id: 1 }, { id: 2 }, { id: 3 }],
						PaginationToken: undefined,
					},
				},
			},
		]);
	});

	test('should fetch all items when returnAll is true', async () => {
		mockMakeRoutingRequest
			.mockResolvedValueOnce({
				json: { Users: [{ id: 1 }, { id: 2 }], PaginationToken: 'token1' },
			})
			.mockResolvedValueOnce({
				json: { Users: [{ id: 3 }], PaginationToken: undefined },
			});

		mockGetNodeParameter.mockReturnValueOnce(true);

		const result = await handlePagination.call(mockContext, resultOptions);

		expect(mockMakeRoutingRequest).toHaveBeenCalledTimes(1);
		expect(result).toEqual([
			{
				json: {
					json: {
						Users: [{ id: 1 }, { id: 2 }],
						PaginationToken: 'token1',
					},
				},
			},
		]);
	});

	test('should handle resource-specific token key', async () => {
		mockMakeRoutingRequest.mockResolvedValueOnce({
			json: { Groups: [{ id: 1 }, { id: 2 }], NextToken: undefined },
		});

		mockGetNodeParameter.mockReturnValueOnce('group');
		mockGetNodeParameter.mockReturnValueOnce(false);
		mockGetNodeParameter.mockReturnValueOnce(10);

		const result = await handlePagination.call(mockContext, resultOptions);

		expect(mockMakeRoutingRequest).toHaveBeenCalledTimes(1);
		expect(result).toEqual([
			{
				json: {
					json: {
						Groups: [{ id: 1 }, { id: 2 }],
						NextToken: undefined,
					},
				},
			},
		]);
	});

	test('should handle empty results', async () => {
		mockMakeRoutingRequest.mockResolvedValueOnce({ json: {} });

		mockGetNodeParameter.mockReturnValueOnce(true);

		const result = await handlePagination.call(mockContext, resultOptions);

		expect(mockMakeRoutingRequest).toHaveBeenCalledTimes(1);
		expect(result).toEqual([
			{
				json: {
					json: {},
				},
			},
		]);
	});
});
