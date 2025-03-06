import { processGroupsResponse } from '../generalFunctions/dataHandling';

describe('processGroupsResponse', () => {
	let mockContext: any;
	let mockGetNodeParameter: jest.Mock;

	beforeEach(() => {
		mockGetNodeParameter = jest.fn();
		mockContext = {
			getNodeParameter: mockGetNodeParameter,
		};
	});

	test('should process groups response correctly', async () => {
		mockGetNodeParameter.mockImplementation((name: string) => {
			if (name === 'includeUsers') return false;
			return undefined;
		});

		const response = {
			body: {
				ListGroupsResponse: {
					ListGroupsResult: {
						Groups: [
							{ GroupName: 'Group1', GroupId: '1' },
							{ GroupName: 'Group2', GroupId: '2' },
						],
					},
				},
			},
			statusCode: 200,
			statusMessage: 'OK',
			headers: {},
		};

		const result = await processGroupsResponse.call(mockContext, [], response);

		expect(result).toHaveLength(2);
		expect(result[0]).toEqual({ json: { GroupName: 'Group1', GroupId: '1' } });
		expect(result[1]).toEqual({ json: { GroupName: 'Group2', GroupId: '2' } });
	});
});
