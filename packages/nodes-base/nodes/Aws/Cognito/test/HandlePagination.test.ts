import { handlePagination } from '../GenericFunctions'; // Adjust the import path if necessary

describe('GenericFunctions - handlePagination', () => {
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
		// Mock responses for pagination
		mockMakeRoutingRequest.mockResolvedValueOnce([
			{ json: { Users: [{ id: 1 }, { id: 2 }, { id: 3 }], PaginationToken: undefined } },
		]);

		// Mock parameters
		mockGetNodeParameter.mockReturnValueOnce(false); // returnAll = false
		mockGetNodeParameter.mockReturnValueOnce(2); // limit = 2

		const result = await handlePagination.call(mockContext, resultOptions);

		expect(mockMakeRoutingRequest).toHaveBeenCalledTimes(1);
		expect(result).toEqual([{ json: { id: 1 } }, { json: { id: 2 } }]);
	});

	test('should fetch all items when returnAll is true', async () => {
		// Mock responses for pagination
		mockMakeRoutingRequest
			.mockResolvedValueOnce([
				{ json: { Users: [{ id: 1 }, { id: 2 }], PaginationToken: 'token1' } },
			])
			.mockResolvedValueOnce([{ json: { Users: [{ id: 3 }], PaginationToken: undefined } }]);

		// Mock parameters
		mockGetNodeParameter.mockReturnValueOnce(true); // returnAll = true

		const result = await handlePagination.call(mockContext, resultOptions);

		expect(mockMakeRoutingRequest).toHaveBeenCalledTimes(2);
		expect(result).toEqual([{ json: { id: 1 } }, { json: { id: 2 } }, { json: { id: 3 } }]);
	});

	test('should handle resource-specific token key', async () => {
		// Mock responses for group resource
		mockMakeRoutingRequest.mockResolvedValueOnce([
			{ json: { Groups: [{ id: 1 }, { id: 2 }], NextToken: undefined } },
		]);

		// Mock parameters
		mockGetNodeParameter.mockReturnValueOnce('group'); // resource = group
		mockGetNodeParameter.mockReturnValueOnce(false); // returnAll = false
		mockGetNodeParameter.mockReturnValueOnce(10); // limit = 10

		const result = await handlePagination.call(mockContext, resultOptions);

		expect(mockMakeRoutingRequest).toHaveBeenCalledTimes(1);
		expect(result).toEqual([{ json: { id: 1 } }, { json: { id: 2 } }]);
	});

	test('should handle empty results', async () => {
		// Mock empty response
		mockMakeRoutingRequest.mockResolvedValueOnce([]);

		// Mock parameters
		mockGetNodeParameter.mockReturnValueOnce(true); // returnAll = true

		const result = await handlePagination.call(mockContext, resultOptions);

		expect(mockMakeRoutingRequest).toHaveBeenCalledTimes(1);
		expect(result).toEqual([]);
	});
});
